"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Money } from "./money";

const TONES = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300",
  stone: "bg-stone-100 text-stone-600 dark:bg-stone-500/10 dark:text-stone-300",
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
  return (
    <div className="group rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <span
          aria-hidden
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-lg",
            TONES[tone]
          )}
        >
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className={cn("mt-2 text-[26px] leading-tight font-semibold tracking-tight", valueClassName)}>
        <Money value={value} />
      </p>
      {sub ? <div className="mt-1 text-[13px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
