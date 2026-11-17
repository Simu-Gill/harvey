"use client";

// Premium KPI card: layered surface, gradient icon tile with a tone-tinted
// glow, an oversized watermark icon, and a hover lift. The value is set in
// the display serif so headline numbers feel engraved, not typeset.

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Money } from "./money";

const TONES = {
  emerald: {
    tile: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30 dark:shadow-emerald-500/25",
    glow: "group-hover:shadow-[0_12px_32px_-12px_oklch(0.596_0.145_163/0.45)]",
    mark: "text-emerald-600/[0.07] dark:text-emerald-400/[0.06]",
  },
  amber: {
    tile: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30 dark:shadow-amber-500/25",
    glow: "group-hover:shadow-[0_12px_32px_-12px_oklch(0.769_0.17_70/0.4)]",
    mark: "text-amber-500/[0.08] dark:text-amber-400/[0.06]",
  },
  red: {
    tile: "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-500/30 dark:shadow-red-500/25",
    glow: "group-hover:shadow-[0_12px_32px_-12px_oklch(0.637_0.2_25/0.4)]",
    mark: "text-red-500/[0.07] dark:text-red-400/[0.07]",
  },
  stone: {
    tile: "bg-gradient-to-br from-stone-500 to-stone-700 text-white shadow-md shadow-stone-500/25",
    glow: "group-hover:shadow-[0_12px_32px_-12px_oklch(0.5_0.01_80/0.3)]",
    mark: "text-stone-500/[0.08] dark:text-stone-400/[0.06]",
  },
} as const;

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "stone",
  sub,
  valueClassName,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  sub?: React.ReactNode;
  valueClassName?: string;
}) {
  const t = TONES[tone];
  return (
    <div
      className={cn(
        "card-lux accent-top group relative overflow-hidden rounded-xl border bg-card p-5",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-ring/40",
        t.glow
      )}
    >
      {/* oversized watermark icon, bottom-right */}
      <Icon
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-3 -bottom-4 size-24 rotate-[-8deg] transition-transform duration-300 group-hover:rotate-0 group-hover:scale-105",
          t.mark
        )}
        strokeWidth={1.5}
      />

      <div className="relative flex items-start justify-between gap-3">
        <p className="mt-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
        <span
          aria-hidden
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
            t.tile
          )}
        >
          <Icon className="size-[19px]" strokeWidth={2.2} />
        </span>
      </div>
      <p
        className={cn(
          "relative mt-3 font-display text-[28px] leading-none font-semibold tracking-tight",
          valueClassName
        )}
      >
        <Money value={value} />
      </p>
      {sub ? (
        <div className="relative mt-2 text-[12.5px] text-muted-foreground">{sub}</div>
      ) : null}
    </div>
  );
}
