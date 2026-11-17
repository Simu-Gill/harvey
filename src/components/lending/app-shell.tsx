"use client";

// Application shell: sidebar + topbar + routed views + sticky footer.
// All overlays (sheets & dialogs) are mounted once here.

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { HandCoins, Landmark, Menu, Moon, Settings2, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp, type View } from "./store";
import { useSettings } from "./queries";
import { MobileSidebar, Sidebar } from "./sidebar";
import { DashboardView } from "./views/dashboard-view";
import { ClientsView } from "./views/clients-view";
import { LoansView } from "./views/loans-view";
import { PaymentsView } from "./views/payments-view";
import { ReportsView } from "./views/reports-view";
import { SettingsView } from "./views/settings-view";
import { ClientSheet } from "./client-sheet";
import { LoanSheet } from "./loan-sheet";
import { ClientDialog } from "./client-dialog";
import { LoanDialog } from "./loan-dialog";
import { PaymentDialog } from "./payment-dialog";

const TITLES: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Portfolio performance at a glance" },
  clients: { title: "Clients", subtitle: "Borrower registry and lending history" },
  loans: { title: "Loans", subtitle: "Disbursements, schedules and balances" },
  payments: { title: "Collections Ledger", subtitle: "Every payment received, fully allocated" },
  reports: { title: "Reports", subtitle: "Performance, aging and concentration analysis" },
  settings: { title: "Settings", subtitle: "Business profile and system defaults" },
};

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className="text-muted-foreground"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden size-[17px] dark:block" />
      <Moon className="size-[17px] dark:hidden" />
    </Button>
  );
}

export function AppShell() {
  const { view, setView } = useApp();
  const { data: settings } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);

  // hash-based view routing (#/clients) so refresh keeps context
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace(/^#\/?/, "");
      const valid = ["dashboard", "clients", "loans", "payments", "reports", "settings"];
      if (valid.includes(h)) useApp.setState({ view: h as View });
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  useEffect(() => {
    const target = `#/${view}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [view]);

  const t = TITLES[view];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
            </Button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-[19px] font-semibold leading-tight tracking-tight">
                {t.title}
              </h1>
              <p className="hidden truncate text-[12.5px] text-muted-foreground sm:block">
                {t.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                onClick={() => useApp.getState().openPaymentDialog()}
                className="h-9 gap-1.5 font-medium shadow-sm"
              >
                <HandCoins className="size-4" aria-hidden />
                <span className="hidden sm:inline">Record Payment</span>
                <span className="sm:hidden">Payment</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => useApp.getState().openLoanDialog()}
                className="h-9 gap-1.5 border-input font-medium"
              >
                <Landmark className="size-4" aria-hidden />
                <span className="hidden md:inline">New Loan</span>
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Settings"
                className="text-muted-foreground"
                onClick={() => setView("settings")}
              >
                <Settings2 className="size-[17px]" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              {view === "dashboard" && <DashboardView />}
              {view === "clients" && <ClientsView />}
              {view === "loans" && <LoansView />}
              {view === "payments" && <PaymentsView />}
              {view === "reports" && <ReportsView />}
              {view === "settings" && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Sticky footer */}
        <footer className="mt-auto border-t bg-card/60">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-4 py-4 text-[11.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              © {new Date().getFullYear()}{" "}
              {settings?.businessName ?? "Meridian Lending Co."}
              <span className="mx-2 text-border sm:hidden" aria-hidden>·</span>
              <span className="block sm:inline"> Loan Management System</span>
            </p>
            <p className="tabular-nums">
              Confidential — internal use only
              {settings?.licence ? ` · ${settings.licence}` : ""}
            </p>
          </div>
        </footer>
      </div>

      {/* Overlays */}
      <ClientSheet />
      <LoanSheet />
      <ClientDialog />
      <LoanDialog />
      <PaymentDialog />
    </div>
  );
}

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[340px] rounded-xl" />
      {Array.from({ length: rows - 2 }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}
