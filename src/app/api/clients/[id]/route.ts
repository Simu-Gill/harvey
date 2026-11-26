import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientDetail } from "@/lib/loan-service";
import { canManage, getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  partnerIds: z.array(z.string()).optional(),
  idNumber: z.string().max(60).nullable().optional(),
  occupation: z.string().max(80).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const detail = await getClientDetail(id, user.role === "partner" ? user.partnerId ?? undefined : undefined);
  if (!detail) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManage(user)) return NextResponse.json({ error: "Read-only access" }, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    const { partnerIds, ...data } = parsed.data;
    await db.client.update({ where: { id }, data: { ...data, ...(partnerIds ? { partners: { set: partnerIds.map((partnerId) => ({ id: partnerId })) } } : {}) } });
    const detail = await getClientDetail(id);
    return NextResponse.json(detail);
  } catch (e) {
    console.error("PATCH /api/clients/[id]", e);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(user)) return NextResponse.json({ error: "Read-only access" }, { status: 403 });
  const { id } = await params;
  const loanCount = await db.loan.count({ where: { clientId: id } });
  if (loanCount > 0) {
    return NextResponse.json(
      {
        error: `This client has ${loanCount} loan${loanCount > 1 ? "s" : ""} on record. Loans must be settled or removed first.`,
      },
      { status: 409 }
    );
  }
  await db.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
