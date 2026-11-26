import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { AuthShell } from "@/components/lending/auth-shell";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if ((await db.user.count()) === 0) redirect("/setup");
  if (await getAuthUser()) redirect("/");
  return <AuthShell />;
}
