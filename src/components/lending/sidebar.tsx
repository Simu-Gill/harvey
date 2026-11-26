"use client";

// The signature dark-green sidebar — always dark in both themes,
// like a private bank's letterhead.

import Image from "next/image";
import {
  BarChart3,
  LayoutDashboard,
  Landmark,
  Receipt,
  Users,
  ShieldCheck,
  X,
} from "lucide-react";
import { useApp, type View } from "./store";
import { useClients, useLoans, useSettings } from "./queries";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

const NAV: { section: string; items: { view: View; label: string; icon: React.ElementType }[] }[] = [
  {
    section: "Overview",
    items: [
      { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { view: "clients", label: "Clients", icon: Users },
      { view: "loans", label: "Loans", icon: Landmark },
      { view: "payments", label: "Collections", icon: Receipt },
    ],
  },
  {
    section: "Insights",
    items: [{ view: "reports", label: "Reports", icon: BarChart3 }],
  },
  {
    section: "Administration",
    items: [{ view: "admin", label: "Users & Partners", icon: ShieldCheck }],
  },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session } = useSession();
  const { view, setView } = useApp();
  const { data: settings } = useSettings();
  const { data: clients } = useClients();
  const { data: loans } = useLoans();

  const activeLoans = loans?.filter((l) => l.status !== "completed").length ?? 0;
  const overdue = loans?.filter((l) => l.status === "overdue").length ?? 0;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[oklch(0.185_0.02_165)] text-stone-300">
      {/* atmospheric depth: emerald aurora at top + vignette at bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[oklch(0.24_0.035_164)] via-transparent to-[oklch(0.13_0.02_168)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[130%] -translate-x-1/2 rounded-full bg-emerald-500/[0.13] blur-3xl"
      />

      {/* Brand — Harvey Enterprise logo mark + wordmark */}
      <div className="relative flex items-center gap-3 px-5 pt-5 pb-4">
        <span className="relative shrink-0">
          <Image
            src="/logo.png"
            alt="Harvey Enterprise logo"
            width={40}
            height={40}
            priority
            className="size-10 rounded-[30%] object-contain shadow-lg shadow-black/40 ring-1 ring-white/15"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[30%] bg-gradient-to-br from-white/[0.14] via-transparent to-transparent"
          />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-[15.5px] font-semibold tracking-tight text-stone-50">
            {settings?.businessName ?? "Harvey Enterprise"}
          </p>
          <p className="mt-1 text-[9px] font-semibold tracking-[0.24em] text-emerald-300/70 uppercase">
            Loan Management
          </p>
        </div>
      </div>

      {/* hairline separating brand from navigation */}
      <div
        aria-hidden
        className="relative mx-5 h-px bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-transparent"
      />

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pt-5 pb-3 scrollbar-slim">
        {NAV.filter((group) => group.section !== "Administration" || session?.user.role === "super_admin").map((group) => (
          <div key={group.section}>
            <div className="flex items-center gap-2.5 px-3 pb-2 pt-1">
              <p
                className={cn(
                  "text-[9.5px] font-semibold tracking-[0.2em] uppercase",
                  group.section === "Overview"
                    ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    : "text-stone-200"
                )}
              >
                {group.section}
              </p>
              <span
                aria-hidden
                className={cn(
                  "h-px flex-1",
                  group.section === "Overview" ? "bg-white/60" : "bg-white/[0.28]"
                )}
              />
            </div>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = view === item.view;
                const Icon = item.icon;
                return (
                  <li key={item.view}>
                    <button
                      onClick={() => {
                        setView(item.view);
                        onNavigate?.();
                      }}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-11 w-full items-center gap-3 rounded-xl border px-2.5 text-[13.5px] font-medium transition-all duration-200",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/60",
                        active
                          ? "border-emerald-300/[0.18] bg-gradient-to-r from-emerald-400/[0.2] via-emerald-400/[0.11] to-emerald-300/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_8px_24px_-16px_rgba(52,211,153,0.65)]"
                          : "border-transparent text-stone-400 hover:translate-x-0.5 hover:border-white/[0.08] hover:bg-white/[0.055] hover:text-stone-100"
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.75)]"
                        />
                      )}
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                          active
                            ? "bg-emerald-300/[0.14] text-emerald-200 ring-1 ring-emerald-200/[0.13]"
                            : "bg-white/[0.035] text-stone-500 ring-1 ring-white/[0.04] group-hover:bg-white/[0.07] group-hover:text-stone-200"
                        )}
                      >
                        <Icon className="size-[15.5px]" aria-hidden />
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.view === "loans" && activeLoans > 0 && (
                        <span
                          className={cn(
                            "min-w-6 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums ring-1 ring-inset",
                            active
                              ? "bg-emerald-300/[0.13] text-emerald-100 ring-emerald-200/[0.12]"
                              : "bg-white/[0.05] text-stone-400 ring-white/[0.05]"
                          )}
                        >
                          {activeLoans}
                        </span>
                      )}
                      {item.view === "clients" && clients && (
                        <span
                          className={cn(
                            "min-w-6 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums ring-1 ring-inset",
                            active
                              ? "bg-emerald-300/[0.13] text-emerald-100 ring-emerald-200/[0.12]"
                              : "bg-white/[0.05] text-stone-400 ring-white/[0.05]"
                          )}
                        >
                          {clients.length}
                        </span>
                      )}
                      {item.view === "payments" && overdue > 0 && (
                        <span className="rounded-full bg-red-500/[0.13] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-red-300/90 ring-1 ring-inset ring-red-300/10">
                          {overdue} late
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {session?.user && <div className="relative mx-3 mb-2 flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-300/15 font-semibold text-emerald-100 ring-2 ring-emerald-300/55 ring-offset-2 ring-offset-[oklch(0.16_0.02_165)]">
          {session.user.image ? <img src={session.user.image} alt={`${session.user.name ?? "User"} profile`} className="size-full object-cover" /> : (session.user.name?.[0] ?? "U")}
        </span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-stone-100">{session.user.name}</p><p className="truncate text-[10px] capitalize text-stone-400">{session.user.role.replace("_", " ")}</p></div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="rounded-lg p-2 text-stone-400 hover:bg-white/10 hover:text-white" aria-label="Sign out"><LogOut className="size-4" /></button>
      </div>}

      {/* Footer of sidebar — supplied Aurath logo */}
      <div className="relative shrink-0 border-t border-white/[0.06] px-5 pt-3.5 pb-3.5">
        <Image
          src="/aurath-wordmark.png"
          alt="Aurath"
          width={1000}
          height={419}
          className="h-auto w-[82px] object-contain"
        />
        <p className="mt-1.5 text-left text-[10.5px] tracking-wide text-stone-500">
          © {new Date().getFullYear()} ·{" "}
          <a
            href="mailto:hi@aurath.net"
            className="text-stone-400 transition-colors hover:text-emerald-300"
          >
            hi@aurath.net
          </a>
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.06] lg:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-stone-950/50 backdrop-blur-[2px] transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="absolute top-4 right-3 z-10 rounded-md p-1.5 text-stone-400 hover:bg-white/10 hover:text-stone-100"
        >
          <X className="size-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
