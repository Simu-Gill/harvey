import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getLoanDetail } from "@/lib/loan-service";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const detail = await getLoanDetail(id);
  if (!detail) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await db.loan.update({ where: { id }, data: parsed.data });
  const detail = await getLoanDetail(id);
  if (!detail) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const paymentCount = await db.payment.count({ where: { loanId: id } });
  if (paymentCount > 0) {
    return NextResponse.json(
      {
        error: `This loan has ${paymentCount} payment${paymentCount > 1 ? "s" : ""} recorded. Delete the payments first, or keep the loan for the audit trail.`,
      },
      { status: 409 }
    );
  }
  await db.loan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
