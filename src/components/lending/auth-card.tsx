"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthCard({ setup = false }: { setup?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");
    if (setup) {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), username, password }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Setup failed");
        setBusy(false);
        return;
      }
    }
    const result = await signIn("credentials", { username, password, redirect: false });
    if (result?.error) {
      setError("Incorrect username or password");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-full rounded-[2rem] border border-white/90 bg-white/95 p-7 shadow-[0_32px_90px_-38px_rgba(6,54,44,0.42)] ring-1 ring-emerald-950/[0.04] backdrop-blur-xl sm:p-11 lg:p-12">
      <div className="mb-9">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-sm font-bold tracking-[0.045em] text-emerald-800 uppercase">Loan Management Portal</p>
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#073c32] text-emerald-200 shadow-lg shadow-emerald-950/20"><LockKeyhole className="size-5" aria-hidden /></span>
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-5xl">{setup ? "Set up account" : "Welcome back"}</h1>
        <p className="mt-3 text-base leading-7 text-slate-500">{setup ? "Create the first account for your portal." : "Sign in to continue to your lending workspace."}</p>
      </div>

      <form action={submit} className="space-y-5">
        {setup && <div className="space-y-2"><Label htmlFor="name" className="text-[15px] font-semibold text-slate-700">Full name</Label><Input id="name" name="name" required autoComplete="name" className="h-14 rounded-xl border-slate-200 bg-slate-50/70 px-4 text-base focus-visible:border-emerald-600 focus-visible:ring-emerald-600/15" /></div>}

        <div className="space-y-2">
          <Label htmlFor="username" className="text-[15px] font-semibold text-slate-700">Username</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input id="username" name="username" required autoCapitalize="none" autoComplete="username" placeholder="Enter your username" className="h-14 rounded-xl border-slate-200 bg-slate-50/70 pl-12 pr-4 text-base placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-emerald-600/15" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[15px] font-semibold text-slate-700">Password</Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input id="password" name="password" type={showPassword ? "text" : "password"} minLength={8} required autoComplete={setup ? "new-password" : "current-password"} placeholder="Enter your password" className="h-14 rounded-xl border-slate-200 bg-slate-50/70 pl-12 pr-12 text-base placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-emerald-600/15" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>
          </div>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

        <Button className="mt-2 h-14 w-full rounded-xl bg-[#087b60] text-base font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:-translate-y-0.5 hover:bg-[#076d56] hover:shadow-xl" disabled={busy}>{busy && <Loader2 className="mr-2 size-5 animate-spin" />}{setup ? "Create account" : "Continue to portal"}</Button>
      </form>
    </div>
  );
}
