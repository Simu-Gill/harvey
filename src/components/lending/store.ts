"use client";

// Global UI state for the single-page app: which view is active and
// which overlays (sheets/dialogs) are open. Lets any component open
// a loan sheet or the payment dialog from anywhere.

import { create } from "zustand";

export type View =
  | "dashboard"
  | "clients"
  | "loans"
  | "payments"
  | "reports";

interface AppStore {
  view: View;
  setView: (v: View) => void;

  loanSheetId: string | null;
  openLoan: (id: string) => void;
  closeLoan: () => void;

  clientSheetId: string | null;
  openClient: (id: string) => void;
  closeClient: () => void;

  // client dialog: null = closed, string = editing existing client id
  clientDialogId: string | null | undefined;
  openClientDialog: (id?: string) => void;
  closeClientDialog: () => void;

  loanDialogClientId: string | null | undefined;
  openLoanDialog: (clientId?: string) => void;
  closeLoanDialog: () => void;

  paymentDialogLoanId: string | null | undefined;
  openPaymentDialog: (loanId?: string) => void;
  closePaymentDialog: () => void;
}

export const useApp = create<AppStore>((set) => ({
  view: "dashboard",
  setView: (view) =>
    set({
      view,
      // switching views closes overlays
      loanSheetId: null,
      clientSheetId: null,
    }),

  loanSheetId: null,
  openLoan: (loanSheetId) => set({ loanSheetId, clientSheetId: null }),
  closeLoan: () => set({ loanSheetId: null }),

  clientSheetId: null,
  openClient: (clientSheetId) => set({ clientSheetId }),
  closeClient: () => set({ clientSheetId: null }),

  clientDialogId: undefined,
  openClientDialog: (id) => set({ clientDialogId: id ?? null }),
  closeClientDialog: () => set({ clientDialogId: undefined }),

  loanDialogClientId: undefined,
  openLoanDialog: (clientId) => set({ loanDialogClientId: clientId ?? null }),
  closeLoanDialog: () => set({ loanDialogClientId: undefined }),

  paymentDialogLoanId: undefined,
  openPaymentDialog: (loanId) => set({ paymentDialogLoanId: loanId ?? null }),
  closePaymentDialog: () => set({ paymentDialogLoanId: undefined }),
}));
