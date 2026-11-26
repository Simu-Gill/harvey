import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser, isSuperAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(8).max(120),
  role: z.enum(["owner", "partner"]),
  partnerId: z.string().nullable().optional(),
  profileImage: z.string().max(1_500_000).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.role === "partner" && !value.partnerId) ctx.addIssue({ code: "custom", path: ["partnerId"], message: "Select a partner" });
});

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(user)) return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
  const rows = await db.user.findMany({ include: { partner: true }, orderBy: { name: "asc" } });
  return NextResponse.json(rows.map((u) => ({ id: u.id, name: u.name, username: u.username, role: u.role, profileImage: u.profileImage, active: u.active, partnerId: u.partnerId, partnerName: u.partner?.name ?? null })));
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(user)) return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid user" }, { status: 400 });
  const created = await db.user.create({ data: { name: parsed.data.name, username: parsed.data.username.toLowerCase(), passwordHash: await hashPassword(parsed.data.password), role: parsed.data.role, partnerId: parsed.data.role === "partner" ? parsed.data.partnerId : null, profileImage: parsed.data.profileImage } });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
