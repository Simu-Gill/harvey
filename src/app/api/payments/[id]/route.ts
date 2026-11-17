import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recomputeLoanAllocations } from "@/lib/loan-service";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const payment = await db.payment.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    await db.payment.delete({ where: { id } });
    await recomputeLoanAllocations(payment.loanId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/payments/[id]", e);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
