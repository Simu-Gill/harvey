import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getPayments, recomputeLoanAllocations, loanToDTO } from "@/lib/loan-service";
import { allocatePayment } from "@/lib/loan-math";
import { getAuthUser } from "@/lib/auth";

const paymentSchema = z.object({
  loanId: z.string().min(1, "Select a loan"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.string().min(8),
  method: z.enum(["cash", "bank_transfer", "mobile_money", "check", "other"]),
  note: z.string().max(300).optional().nullable(),
  recordedBy: z.string().max(80).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const loanId = req.nextUrl.searchParams.get("loanId") ?? undefined;
    const limitParam = req.nextUrl.searchParams.get("limit");
    const payments = await getPayments({
      loanId,
      limit: limitParam ? Number(limitParam) : undefined,
      partnerId: user.role === "partner" ? user.partnerId ?? undefined : undefined,
    });
    return NextResponse.json(payments);
  } catch (e) {
    console.error("GET /api/payments", e);
    return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const loan = await db.loan.findFirst({
      where: { id: d.loanId, ...(user.role === "partner" ? { client: { partners: { some: { id: user.partnerId! } } } } : {}) },
      include: { payments: true, client: true },
    });
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 400 });

    const date = new Date(d.date);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid payment date" }, { status: 400 });
    }

    // Validate against the remaining balance and derive the split
    const mathLoan = {
      ...loan,
      principal: Number(loan.principal),
      interestRate: Number(loan.interestRate),
    };
    const mathPayments = loan.payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
      interestPart: Number(payment.interestPart),
      principalPart: Number(payment.principalPart),
    }));
    const alloc = allocatePayment(mathLoan, mathPayments, d.amount, date);
    if (d.amount > alloc.balanceBefore + 0.005) {
      return NextResponse.json(
        {
          error: `Payment exceeds the remaining balance of ${alloc.balanceBefore.toFixed(2)}. Use "Pay full balance" to settle exactly.`,
        },
        { status: 400 }
      );
    }

    const payment = await db.payment.create({
      data: {
        loanId: loan.id,
        amount: d.amount,
        interestPart: alloc.interestPart,
        principalPart: alloc.principalPart,
        date,
        method: d.method,
        note: d.note || null,
        recordedBy: user.name ?? d.recordedBy?.trim() ?? null,
        createdByUserId: user.id,
      },
    });

    // re-derive splits chronologically (handles back-dated entries)
    await recomputeLoanAllocations(loan.id);

    const updated = await db.loan.findUnique({
      where: { id: loan.id },
      include: { payments: true, client: true },
    });

    return NextResponse.json(
      {
        paymentId: payment.id,
        allocation: alloc,
        loan: updated ? loanToDTO(updated) : null,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/payments", e);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
