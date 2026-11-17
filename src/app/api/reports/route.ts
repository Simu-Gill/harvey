import { NextResponse } from "next/server";
import { getReports } from "@/lib/loan-service";

export async function GET() {
  try {
    const data = await getReports();
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET /api/reports", e);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}
