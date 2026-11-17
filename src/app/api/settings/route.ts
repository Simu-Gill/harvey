import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/loan-service";

const settingsSchema = z.object({
  businessName: z.string().min(1).max(80),
  tagline: z.string().max(120),
  licence: z.string().max(80),
  email: z.string().max(120),
  phone: z.string().max(40),
  address: z.string().max(200),
  currency: z.string().min(3).max(4),
  defaultRate: z.coerce.number().min(0).max(100),
  rateUnit: z.enum(["monthly", "term"]),
  defaultTerm: z.coerce.number().int().min(1).max(60),
});

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    await getSettings(); // ensure the singleton row exists
    await db.setting.update({
      where: { id: "singleton" },
      data: parsed.data,
    });
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error("PUT /api/settings", e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
