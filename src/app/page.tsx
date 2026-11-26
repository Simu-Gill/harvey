import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  if ((await db.user.count()) === 0) {
    redirect("/setup");
  }

  if (!(await getAuthUser())) {
    redirect("/login");
  }

  redirect("/dashboard");
}