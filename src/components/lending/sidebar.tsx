"use client";

// The signature dark-green sidebar — always dark in both themes,
// like a private bank's letterhead.

import { useId } from "react";
import Image from "next/image";
import {
  BarChart3,
  LayoutDashboard,
  Landmark,
  Receipt,
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
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pt-4 pb-3 scrollbar-slim">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="flex items-center gap-2.5 px-2.5 pb-2">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-stone-500 uppercase">
                {group.section}
              </p>
              <span
                aria-hidden
                className="h-px flex-1 bg-gradient-to-r from-white/[0.1] to-transparent"
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
                        "group relative flex w-full items-center gap-3 rounded-xl py-[7px] pr-2.5 pl-2.5 text-[13.5px] font-medium transition-all duration-200",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/60",
                        active
                          ? "bg-gradient-to-r from-emerald-400/[0.17] via-emerald-400/[0.07] to-transparent text-emerald-50 ring-1 ring-emerald-300/[0.14] shadow-[inset_0_1px_0_oklch(1_0_0/0.07),0_10px_24px_-14px_oklch(0.696_0.17_162/0.5)]"
                          : "text-stone-400 hover:bg-white/[0.05] hover:text-stone-100"
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute top-2 bottom-2 -left-2 w-[3px] rounded-full bg-gradient-to-b from-emerald-300 to-teal-500 shadow-[0_0_12px_oklch(0.696_0.17_162/0.85)]"
                        />
                      )}
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-all duration-200",
                          active
                            ? "bg-emerald-400/[0.18] text-emerald-300 ring-emerald-300/20"
                            : "bg-white/[0.05] text-stone-400 ring-white/[0.06] group-hover:scale-105 group-hover:bg-emerald-400/10 group-hover:text-emerald-200"
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="flex-1 text-left tracking-[0.01em]">
                        {item.label}
                      </span>
                      {item.view === "loans" && activeLoans > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] tabular-nums ring-1",
                            active
                              ? "bg-emerald-400/[0.16] text-emerald-200 ring-emerald-300/25"
                              : "bg-white/[0.07] text-stone-300 ring-white/10"
                          )}
                        >
                          {activeLoans}
                        </span>
                      )}
                      {item.view === "clients" && clients && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] tabular-nums ring-1",
                            active
                              ? "bg-emerald-400/[0.16] text-emerald-200 ring-emerald-300/25"
                              : "bg-white/[0.07] text-stone-300 ring-white/10"
                          )}
                        >
                          {clients.length}
                        </span>
                      )}
                      {item.view === "payments" && overdue > 0 && (
                        <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] tabular-nums text-red-300 ring-1 ring-red-400/20">
                          <span aria-hidden className="size-1.5 rounded-full bg-red-400/80" />
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

      {/* Footer of sidebar — Aurath Solutions wordmark */}
      <div className="relative shrink-0 border-t border-white/[0.06] px-5 pt-3.5 pb-3.5">
        {/* Stacked, full-width justified lockup at a true 70px size.
            SVG textLength keeps each word exactly filling the column in
            any font of the stack (Avallon Alt when installed).
            The gradient id is unique per sidebar instance so the mobile
            drawer never resolves the hidden desktop sidebar's paint. */}
        <SidebarWordmark />
        <p className="mt-2 text-left text-[10.5px] tracking-wide text-stone-500">
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

function SidebarWordmark() {
  const gradId = useId();
  const paint = `url(#${gradId})`;
  return (
    <svg
      viewBox="0 0 216 116"
      width="100%"
      aria-hidden
      className="font-aurath block"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.975 0.004 90)" />
          <stop offset="100%" stopColor="oklch(0.805 0.018 95)" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="50"
        fontSize="70"
        fontWeight="600"
        fill={paint}
        textLength="216"
        lengthAdjust="spacingAndGlyphs"
      >
        Aurath
      </text>
      <text
        x="0"
        y="108"
        fontSize="70"
        fontWeight="600"
        fill={paint}
        textLength="216"
        lengthAdjust="spacingAndGlyphs"
      >
        Solutions
      </text>
    </svg>
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
