import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser, isSuperAdmin } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.partner.findMany({
    where: user.role === "partner" ? { id: user.partnerId! } : undefined,
    include: { _count: { select: { clients: true, users: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(rows.map((p) => ({ id: p.id, name: p.name, contactNumber: p.contactNumber, active: p.active, clientCount: p._count.clients, userCount: p._count.users })));
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(user)) return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
  const parsed = z.object({ name: z.string().trim().min(2).max(80), contactNumber: z.string().trim().min(5).max(40) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid partner" }, { status: 400 });
  const partner = await db.partner.create({ data: parsed.data });
  return NextResponse.json(partner, { status: 201 });
}
