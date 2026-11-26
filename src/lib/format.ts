import { format, parseISO } from "date-fns";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  GHS: "GH₵",
  NGN: "₦",
  KES: "KSh",
  ZAR: "R",
  INR: "₹",
  PHP: "₱",
  CAD: "C$",
  AUD: "A$",
  MYR: "RM",
};

export const currencySymbol = (code: string): string =>
  CURRENCY_SYMBOLS[code] ?? code + " ";

/** Full money format, e.g. $12,450.00 */
export function fmtMoney(
  n: number | null | undefined,
  currency = "MYR",
  opts?: { compact?: boolean; cents?: boolean }
): string {
  if (n == null || !Number.isFinite(n)) n = 0;
  const sym = currencySymbol(currency);
  if (opts?.compact && Math.abs(n) >= 10000) {
    const v = n / 1000;
    return `${n < 0 ? "-" : ""}${sym}${v.toFixed(v >= 100 ? 0 : 1)}k`;
  }
  const abs = Math.abs(n);
  const showCents = opts?.cents ?? abs % 1 !== 0; // cents only when requested or value has fractions
  return `${n < 0 ? "−" : ""}${sym}${abs.toLocaleString("en-US", {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact axis format, e.g. $12k */
export function fmtAxis(n: number, currency = "MYR"): string {
  const sym = currencySymbol(currency);
  if (Math.abs(n) >= 1000) return `${sym}${Math.round(n / 1000)}k`;
  return `${sym}${n}`;
}

const toDate = (d: string | Date): Date =>
  typeof d === "string" ? parseISO(d) : d;

/** "Mar 14, 2025" */
export const fmtDate = (d: string | Date | null | undefined): string =>
  d ? format(toDate(d), "MMM d, yyyy") : "—";

/** "Mar 14" */
export const fmtDateShort = (d: string | Date | null | undefined): string =>
  d ? format(toDate(d), "MMM d") : "—";

/** "Mar 2025" */
export const fmtMonth = (d: string | Date | null | undefined): string =>
  d ? format(toDate(d), "MMM yyyy") : "—";

/** yyyy-MM-dd for <input type="date"> */
export const toInputDate = (d: string | Date = new Date()): string =>
  format(toDate(d), "yyyy-MM-dd");

/** "3 mo" term label */
export const fmtTerm = (months: number): string =>
  `${months} mo${months > 12 ? ` (${(months / 12).toFixed(1).replace(/\.0$/, "")} yr)` : ""}`;

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const AVATAR_HUES = [
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-teal-100 text-teal-800",
  "bg-rose-100 text-rose-800",
  "bg-lime-100 text-lime-800",
  "bg-orange-100 text-orange-800",
  "bg-cyan-100 text-cyan-800",
  "bg-fuchsia-100 text-fuchsia-800",
];

export function avatarHue(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}
