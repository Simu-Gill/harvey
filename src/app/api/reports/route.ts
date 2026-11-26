import { NextResponse } from "next/server";
import { getReports } from "@/lib/loan-service";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const data = await getReports(user.role === "partner" ? user.partnerId ?? undefined : undefined);
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET /api/reports", e);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}
