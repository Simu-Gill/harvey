import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser, isSuperAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  password: z.string().min(8).max(120).optional(),
  profileImage: z.string().max(1_500_000).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await getAuthUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(admin)) return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update" }, { status: 400 });
  const { id } = await params;
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { password, username, ...rest } = parsed.data;
  const updated = await db.user.update({
    where: { id },
    data: {
      ...rest,
      ...(username ? { username: username.toLowerCase() } : {}),
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
    include: { partner: true },
  });
  return NextResponse.json({ id: updated.id, name: updated.name, username: updated.username, role: updated.role, profileImage: updated.profileImage, active: updated.active, partnerId: updated.partnerId, partnerName: updated.partner?.name ?? null });
}
