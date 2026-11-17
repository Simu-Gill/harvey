import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/loan-service";

export async function GET() {
  try {
    const data = await getDashboard();
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET /api/dashboard", e);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
