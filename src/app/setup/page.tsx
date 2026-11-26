import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AuthShell } from "@/components/lending/auth-shell";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await db.user.count()) > 0) redirect("/login");
  return <AuthShell setup />;
}
