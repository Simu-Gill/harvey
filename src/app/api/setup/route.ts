import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(8).max(120),
});

export async function GET() {
  return NextResponse.json({ required: (await db.user.count()) === 0 });
}

export async function POST(req: NextRequest) {
  if ((await db.user.count()) !== 0) {
    return NextResponse.json({ error: "Setup has already been completed" }, { status: 409 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 400 });
  }
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      username: parsed.data.username.toLowerCase(),
      passwordHash: await hashPassword(parsed.data.password),
      role: "super_admin",
    },
  });
  return NextResponse.json({ id: user.id }, { status: 201 });
}
