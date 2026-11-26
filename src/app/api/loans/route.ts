import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getLoans, getSettings } from "@/lib/loan-service";
import { getAuthUser } from "@/lib/auth";

const loanSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  principal: z.coerce.number().positive("Principal must be greater than 0").max(10_000_000),
  interestRate: z.coerce.number().min(0, "Rate cannot be negative").max(100),
  rateUnit: z.enum(["monthly", "term"]),
  termMonths: z.coerce.number().int().min(1, "Term must be at least 1 month").max(60),
  startDate: z.string().min(8),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const loans = await getLoans(user.role === "partner" ? user.partnerId ?? undefined : undefined);
    return NextResponse.json(loans);
  } catch (e) {
    console.error("GET /api/loans", e);
    return NextResponse.json({ error: "Failed to load loans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const parsed = loanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const client = await db.client.findFirst({ where: { id: d.clientId, ...(user.role === "partner" ? { partners: { some: { id: user.partnerId! } } } : {}) } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 400 });

    const start = new Date(d.startDate);
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
    }

    // reference: LN-<year>-<sequence within that year>
    const year = start.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    const count = await db.loan.count({
      where: { startDate: { gte: yearStart, lt: yearEnd } },
    });
    const reference = `LN-${year}-${String(count + 1).padStart(4, "0")}`;

    const loan = await db.loan.create({
      data: {
        reference,
        clientId: d.clientId,
        principal: d.principal,
        interestRate: d.interestRate,
        rateUnit: d.rateUnit,
        termMonths: d.termMonths,
        startDate: start,
        notes: d.notes || null,
        createdById: user.id,
      },
      include: { client: true, payments: true },
    });

    const { loanToDTO } = await import("@/lib/loan-service");
    await getSettings(); // ensure settings exist
    return NextResponse.json(loanToDTO(loan), { status: 201 });
  } catch (e) {
    console.error("POST /api/loans", e);
    return NextResponse.json({ error: "Failed to create loan" }, { status: 500 });
  }
}
