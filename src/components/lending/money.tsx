"use client";

// Money renders currency-aware amounts using live settings,
// with tabular figures for clean column alignment.

import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSettings } from "./queries";

export function useCurrency() {
  const { data } = useSettings();
  return data?.currency ?? "MYR";
}

export function Money({
  value,
  className,
  compact,
  cents,
}: {
  value: number | null | undefined;
  className?: string;
  compact?: boolean;
  cents?: boolean;
}) {
  const currency = useCurrency();
  return (
    <span className={cn("tabular-nums", className)}>
      {fmtMoney(value ?? 0, currency, { compact, cents })}
    </span>
  );
}
