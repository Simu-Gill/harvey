import { AppShell } from "@/components/lending/app-shell";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_VIEWS = [
  "dashboard",
  "clients",
  "loans",
  "payments",
  "reports",
  "admin",
];

export default async function ViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;

  if (!VALID_VIEWS.includes(view)) {
    notFound();
  }

  if ((await db.user.count()) === 0) {
    redirect("/setup");
  }

  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  if (view === "admin" && user.role !== "super_admin") {
    redirect("/dashboard");
  }

  return <AppShell />;
}