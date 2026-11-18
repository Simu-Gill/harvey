"use client";

// The signature dark-green sidebar — always dark in both themes,
// like a private bank's letterhead.

import {
  BarChart3,
  LayoutDashboard,
  Landmark,
  Receipt,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useApp, type View } from "./store";
import { useClients, useLoans, useSettings } from "./queries";
import { cn } from "@/lib/utils";

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
    section: "System",
    items: [{ view: "settings", label: "Settings", icon: Settings2 }],
  },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
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

      {/* Brand */}
      <div className="relative flex items-center gap-3 px-5 pt-6 pb-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-display text-[22px] font-semibold text-emerald-950 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-300/40">
          {(settings?.businessName ?? "M").charAt(0)}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-[15px] font-semibold text-stone-50">
            {settings?.businessName ?? "Meridian Lending Co."}
          </p>
          <p className="mt-0.5 text-[9.5px] font-medium uppercase tracking-[0.22em] text-emerald-300/70">
            Loan Management
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 scrollbar-slim">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              {group.section}
            </p>
            <ul className="space-y-0.5">
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
                        "group relative flex w-full items-center gap-3 rounded-lg py-2 text-[13.5px] font-medium transition-all duration-150",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/60",
                        active
                          ? "bg-gradient-to-r from-emerald-400/[0.16] to-emerald-400/[0.03] text-emerald-50 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]"
                          : "text-stone-400 hover:bg-white/[0.05] hover:text-stone-100"
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute top-1.5 bottom-1.5 -left-1.5 w-[3px] rounded-full bg-gradient-to-b from-emerald-300 to-teal-500 shadow-[0_0_10px_oklch(0.696_0.17_162/0.8)]"
                        />
                      )}
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
                          active
                            ? "bg-emerald-400/15 text-emerald-300"
                            : "group-hover:bg-white/[0.06]"
                        )}
                      >
                        <Icon className="size-[16px]" aria-hidden />
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.view === "loans" && activeLoans > 0 && (
                        <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] tabular-nums text-stone-300 ring-1 ring-white/10">
                          {activeLoans}
                        </span>
                      )}
                      {item.view === "clients" && clients && (
                        <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] tabular-nums text-stone-300 ring-1 ring-white/10">
                          {clients.length}
                        </span>
                      )}
                      {item.view === "payments" && overdue > 0 && (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] tabular-nums text-red-300 ring-1 ring-red-400/20">
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

      {/* Footer of sidebar */}
      <div className="relative border-t border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="pulse-dot text-emerald-400" aria-hidden />
          <p className="text-[10.5px] font-medium tracking-wide text-emerald-300/80">
            Ledger live · {settings?.licence || "Licence pending"}
          </p>
        </div>
        <p className="mt-2 text-[10px] tracking-wide text-stone-600">
          MERIDIAN · v1.0
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
