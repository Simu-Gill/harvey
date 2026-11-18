"use client";

// Settings: business identity, lending defaults, and a plain-language
// guide to how the system computes interest — so the numbers are
// never a mystery to the family running it.

import { useState } from "react";
import { Building2, Calculator, Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SettingsDTO } from "@/lib/types";
import { useSaveSettings, useSettings } from "../queries";

const CURRENCIES = ["USD", "EUR", "GBP", "GHS", "NGN", "KES", "ZAR", "INR", "PHP", "CAD", "AUD"];

export function SettingsView() {
  const { data: settings } = useSettings();
  if (!settings) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }
  // remounts whenever saved settings change so the form stays in sync
  return <SettingsForm key={JSON.stringify(settings)} initial={settings} />;
}

function SettingsForm({ initial }: { initial: SettingsDTO }) {
  const saveSettings = useSaveSettings();
  const [form, setForm] = useState<SettingsDTO>(initial);

  const set = <K extends keyof SettingsDTO>(k: K, v: SettingsDTO[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    try {
      await saveSettings.mutateAsync(form);
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="card-lux">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5 text-[15px]">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
              <Building2 className="size-4" />
            </span>{" "}
            Business Profile
          </CardTitle>
          <CardDescription>Appears on the sidebar, footer, and reports.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
          </Field>
          <Field label="Tagline">
            <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="Licence / registration">
            <Input value={form.licence} onChange={(e) => set("licence", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card className="card-lux">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5 text-[15px]">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/25">
              <SlidersHorizontal className="size-4" />
            </span>{" "}
            Lending Defaults
          </CardTitle>
          <CardDescription>
            Pre-filled every time a new loan is created — change per loan at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Currency">
            <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Default interest rate (%)">
            <Input
              type="number" min={0} step="0.1"
              value={form.defaultRate}
              onChange={(e) => set("defaultRate", Number(e.target.value))}
            />
          </Field>
          <Field label="Rate basis">
            <Select value={form.rateUnit} onValueChange={(v) => set("rateUnit", v as "monthly" | "term")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">% per month</SelectItem>
                <SelectItem value="term">% whole term</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Default term (months)">
            <Input
              type="number" min={1} max={60}
              value={form.defaultTerm}
              onChange={(e) => set("defaultTerm", Number(e.target.value))}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saveSettings.isPending} className="gap-1.5 min-w-32">
          {saveSettings.isPending && <Loader2 className="size-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <Card className="card-lux bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5 text-[15px]">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-stone-500 to-stone-700 text-white shadow-md shadow-stone-500/25">
              <Calculator className="size-4" />
            </span>{" "}
            How the Numbers Work
          </CardTitle>
          <CardDescription>The exact rules this system applies — no hidden maths.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-[13px] leading-relaxed text-foreground/85">
          <Rule title="Interest is fixed, never compounding">
            For a $3,000 loan at 10% per month over 3 months, interest is 3 × $300 = $900 for
            the whole term. The outstanding balance never generates extra interest, and paying
            late never adds interest on interest.
          </Rule>
          <Rule title="Expected instalment">
            Total obligation ($3,900) ÷ term (3) = $1,300 per month. This is the pace the
            schedule expects — borrowers are free to pay more, less, or nothing in a given
            month.
          </Rule>
          <Rule title="Every payment clears interest first">
            A payment first covers the interest that has accrued so far ($300 after each
            month in the example), then reduces principal. A $300 payment is therefore an
            interest-only month; a $1,300 payment is one month of interest plus $1,000 of
            principal.
          </Rule>
          <Rule title="Status is derived, never guessed">
            <span className="text-emerald-700 dark:text-emerald-400">On track</span> — paying
            to schedule. <span className="text-amber-700 dark:text-amber-400">Behind</span> —
            more than half an instalment under schedule.{" "}
            <span className="text-red-600 dark:text-red-400">Overdue</span> — past maturity
            with a balance. <span className="text-muted-foreground">Settled</span> — nothing
            outstanding.
          </Rule>
          <Rule title="Full audit trail">
            Every payment keeps its date, method, note, and exact interest/principal split.
            Deleting a payment automatically recalculates the loan from scratch.
          </Rule>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="accent-top card-lux rounded-lg border bg-card p-3.5">
      <p className="text-[12.5px] font-semibold text-foreground">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}
