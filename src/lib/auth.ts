import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { verifyPassword } from "./password";

export type UserRole = "super_admin" | "owner" | "partner";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 8;
const loginFailures = new Map<string, { count: number; resetAt: number }>();

function loginKey(username: string, headers?: Record<string, unknown>) {
  const forwarded = headers?.["x-forwarded-for"];
  const rawIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const realIp = headers?.["x-real-ip"];
  const ip =
    (typeof rawIp === "string" ? rawIp.split(",")[0]?.trim() : "") ||
    (typeof realIp === "string" ? realIp : "unknown");
  return `${ip}:${username}`;
}

function canAttemptLogin(key: string) {
  const now = Date.now();
  const state = loginFailures.get(key);
  if (!state || state.resetAt <= now) {
    loginFailures.delete(key);
    return true;
  }
  return state.count < MAX_LOGIN_FAILURES;
}

function recordLoginFailure(key: string) {
  const now = Date.now();
  const state = loginFailures.get(key);
  if (!state || state.resetAt <= now) {
    loginFailures.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  state.count += 1;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Username and password",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const username = credentials?.username?.trim().toLowerCase();
        if (!username || !credentials?.password) return null;
        const key = loginKey(username, request.headers);
        if (!canAttemptLogin(key)) return null;
        const user = await db.user.findUnique({ where: { username } });
        if (!user?.active || !(await verifyPassword(credentials.password, user.passwordHash))) {
          recordLoginFailure(key);
          return null;
        }
        if (user.role === "partner" && !user.partnerId) {
          recordLoginFailure(key);
          return null;
        }
        loginFailures.delete(key);
       return {
  id: user.id,
  name: user.name,
  username: user.username,
  role: user.role as UserRole,
  partnerId: user.partnerId,
  image: null,
};
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.username = user.username;
    token.role = user.role;
    token.partnerId = user.partnerId;
  }

  // Prevent profile images from bloating session cookies
  delete token.picture;
  delete token.image;
  delete token.profileImage;
  delete token.profilePicture;

  return token;
},
    async session({ session, token }) {
      if (session.user) {
        const current = await db.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, profileImage: true, role: true, partnerId: true, active: true },
        });
        if (!current?.active) {
          return { ...session, user: undefined } as unknown as typeof session;
        }
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.name = current.name;
        session.user.role = current.role as UserRole;
        session.user.partnerId = current.partnerId;
        session.user.image = current.profileImage;
      }
      return session;
    },
  },
};

export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export function canManage(user: { role: UserRole }) {
  return user.role === "owner" || user.role === "super_admin";
}

export function isSuperAdmin(user: { role: UserRole }) {
  return user.role === "super_admin";
}
