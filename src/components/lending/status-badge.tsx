"use client";

// Status badges shared across loans, clients and dashboard.
// Each status gets a directional gradient wash, a hairline ring,
// and a live dot for statuses that are still in motion.

import {
  CheckCircle2,
  CircleDashed,
  Clock,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoanStatus } from "@/lib/types";

const MAP: Record<
  string,
  { label: string; icon: React.ElementType; className: string; live?: boolean }
> = {
  on_track: {
    label: "On track",
    icon: CircleDashed,
    className:
      "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-600/20 dark:from-emerald-500/15 dark:to-teal-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
    live: true,
  },
  behind: {
    label: "Behind",
    icon: Clock,
    className:
      "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 ring-amber-600/20 dark:from-amber-500/15 dark:to-orange-500/10 dark:text-amber-300 dark:ring-amber-400/25",
    live: true,
  },
  overdue: {
    label: "Overdue",
    icon: TriangleAlert,
    className:
      "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 ring-red-600/20 dark:from-red-500/15 dark:to-rose-500/10 dark:text-red-300 dark:ring-red-400/25",
    live: true,
  },
  completed: {
    label: "Settled",
    icon: CheckCircle2,
    className:
      "bg-gradient-to-r from-stone-100 to-stone-50 text-stone-600 ring-stone-500/20 dark:from-stone-500/15 dark:to-stone-400/5 dark:text-stone-300 dark:ring-stone-400/20",
  },
  clean: {
    label: "No loans",
    icon: CircleDashed,
    className:
      "bg-gradient-to-r from-stone-100 to-stone-50 text-stone-500 ring-stone-400/20 dark:from-stone-500/10 dark:to-stone-400/5 dark:text-stone-400 dark:ring-stone-500/20",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: LoanStatus | "clean";
  className?: string;
}) {
  const conf = MAP[status] ?? MAP.clean;
  const Icon = conf.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ring-1 ring-inset whitespace-nowrap",
        conf.className,
        className
      )}
    >
      {conf.live ? (
        <span aria-hidden className="pulse-dot bg-current" />
      ) : (
        <Icon className="size-3.5" aria-hidden />
      )}
      {conf.label}
    </span>
  );
}

export const statusLabel = (s: string) => MAP[s]?.label ?? s;
