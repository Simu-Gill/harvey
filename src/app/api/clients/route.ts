import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClients } from "@/lib/loan-service";
import { canManage, getAuthUser } from "@/lib/auth";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  partnerIds: z.array(z.string()).default([]),
  idNumber: z.string().max(60).optional().nullable(),
  occupation: z.string().max(80).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clients = await getClients(user.role === "partner" ? user.partnerId ?? undefined : undefined);
    return NextResponse.json(clients);
  } catch (e) {
    console.error("GET /api/clients", e);
    return NextResponse.json({ error: "Failed to load clients" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManage(user)) return NextResponse.json({ error: "Partners cannot create clients" }, { status: 403 });
    const body = await req.json();
    const parsed = clientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const client = await db.client.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        partners: { connect: parsed.data.partnerIds.map((id) => ({ id })) },
        idNumber: parsed.data.idNumber || null,
        occupation: parsed.data.occupation || null,
        notes: parsed.data.notes || null,
      },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (e) {
    console.error("POST /api/clients", e);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
