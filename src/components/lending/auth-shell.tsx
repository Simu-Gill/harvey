import Image from "next/image";
import { Landmark, LockKeyhole, ReceiptText, UsersRound } from "lucide-react";
import { AuthCard } from "./auth-card";

const portfolioItems = [
  { icon: Landmark, label: "Loans", tone: "bg-emerald-300/15 text-emerald-200" },
  { icon: ReceiptText, label: "Collections", tone: "bg-amber-200/15 text-amber-100" },
  { icon: UsersRound, label: "Clients", tone: "bg-sky-200/15 text-sky-100" },
];

export function AuthShell({ setup = false }: { setup?: boolean }) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#f4f7f5] lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#073c32] text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute -left-32 -top-32 size-[30rem] rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="absolute -bottom-52 -right-28 size-[38rem] rounded-full border-[90px] border-white/[0.035]" />
          <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:64px_64px]" />
        </div>

        <header className="relative flex items-center gap-4 px-12 pt-10 xl:px-16 xl:pt-12">
          <Image src="/logo.png" alt="Harvey Enterprise" width={56} height={56} priority className="size-14 rounded-2xl object-contain shadow-2xl shadow-black/25 ring-1 ring-white/20" />
          <div>
            <p className="font-display text-xl font-semibold tracking-tight">Harvey Enterprise</p>
            <p className="mt-1 text-xs font-semibold tracking-[0.22em] text-emerald-200/70 uppercase">Loan Management</p>
          </div>
        </header>

        <div className="relative px-12 xl:px-16">
          <div className="mb-7">
            <h1 className="max-w-xl font-display text-5xl font-semibold leading-[1.02] tracking-[-0.04em] xl:text-6xl">
              Lending control,<br /><span className="text-emerald-300">without the clutter.</span>
            </h1>
          </div>

          <div className="max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/15 backdrop-blur-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-300" />
                <span className="h-2 w-16 rounded-full bg-white/15" />
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/[0.07] ring-1 ring-white/10">
                <Image src="/logo.png" alt="" width={28} height={28} className="size-7 rounded-lg object-contain" />
              </span>
            </div>

            <div className="flex gap-3">
            {portfolioItems.map(({ icon: Icon, label, tone }) => (
              <div key={label} className="flex flex-1 flex-col gap-4 rounded-2xl border border-white/10 bg-black/[0.08] p-4">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" aria-hidden /></span>
                <span className="text-sm font-medium text-white/80">{label}</span>
              </div>
            ))}
            </div>

            <div className="mt-4 flex h-24 items-end gap-3 rounded-2xl border border-white/[0.08] bg-black/[0.08] px-5 pb-4 pt-6" aria-hidden>
              {[38, 62, 49, 78, 58, 88, 72, 94, 82].map((height, index) => (
                <span key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-400/25 to-emerald-200/70" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </div>

        <footer className="relative flex items-end justify-between gap-6 px-12 pb-10 text-[13px] text-white/45 xl:px-16 xl:pb-12">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>© {new Date().getFullYear()}</span>
            <span aria-hidden className="text-white/20">•</span>
            <span>Powered by Aurath Network</span>
            <span aria-hidden className="text-white/20">•</span>
            <a href="mailto:hi@aurath.net" className="transition-colors hover:text-emerald-300">hi@aurath.net</a>
          </p>
          <Image src="/aurath-wordmark.png" alt="Aurath" width={2188} height={719} className="h-auto w-24 shrink-0 opacity-70" />
        </footer>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-10 lg:px-12 xl:px-20">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute right-[-10rem] top-[-12rem] size-[34rem] rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="absolute bottom-[-14rem] left-[-10rem] size-[30rem] rounded-full bg-amber-100/50 blur-3xl" />
        </div>

        <div className="relative w-full max-w-[560px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src="/logo.png" alt="Harvey Enterprise" width={50} height={50} className="size-12 rounded-xl object-contain shadow-lg" priority />
            <div>
              <p className="font-display text-xl font-semibold">Harvey Enterprise</p>
              <p className="text-xs font-semibold tracking-[0.18em] text-emerald-800 uppercase">Loan Management</p>
            </div>
          </div>
          <AuthCard setup={setup} />
          <div className="mx-auto mt-7 flex items-center justify-center text-sm font-semibold text-slate-500">
            <span className="flex items-center gap-2"><LockKeyhole className="size-4 text-emerald-700" aria-hidden />Securely encrypted and protected</span>
          </div>
        </div>
      </section>
    </main>
  );
}
