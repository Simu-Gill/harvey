"use client";

// Typed data layer: react-query hooks for every API endpoint plus
// the mutations that keep the whole app consistent after writes.

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  ClientDTO,
  DashboardDTO,
  LoanDTO,
  PaymentDTO,
  ReportsDTO,
  SettingsDTO,
  PartnerDTO,
  UserDTO,
} from "@/lib/types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

export function useSettings() {
  return useQuery<SettingsDTO>({
    queryKey: ["settings"],
    queryFn: () => api<SettingsDTO>("/api/settings"),
    staleTime: 5 * 60_000,
  });
}

export function useDashboard() {
  return useQuery<DashboardDTO>({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardDTO>("/api/dashboard"),
  });
}

export function useClients() {
  return useQuery<ClientDTO[]>({
    queryKey: ["clients"],
    queryFn: () => api<ClientDTO[]>("/api/clients"),
  });
}

export function usePartners() {
  return useQuery<PartnerDTO[]>({ queryKey: ["partners"], queryFn: () => api<PartnerDTO[]>("/api/partners") });
}

export function useUsers() {
  return useQuery<UserDTO[]>({ queryKey: ["users"], queryFn: () => api<UserDTO[]>("/api/users") });
}

export function useCreatePartner() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: Record<string, unknown>) => api("/api/partners", { method: "POST", body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }) });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: Record<string, unknown>) => api("/api/users", { method: "POST", body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }) });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useLoans() {
  return useQuery<LoanDTO[]>({
    queryKey: ["loans"],
    queryFn: () => api<LoanDTO[]>("/api/loans"),
  });
}

export interface LoanDetail {
  loan: LoanDTO;
  schedule: {
    month: number;
    dueDate: string;
    expectedPayment: number;
    expectedCumulative: number;
  }[];
  payments: PaymentDTO[];
}

export function useLoanDetail(id: string | null) {
  return useQuery<LoanDetail>({
    queryKey: ["loan", id],
    queryFn: () => api<LoanDetail>(`/api/loans/${id}`),
    enabled: !!id,
  });
}

export interface ClientDetail {
  client: ClientDTO;
  loans: LoanDTO[];
  payments: PaymentDTO[];
}

export function useClientDetail(id: string | null) {
  return useQuery<ClientDetail>({
    queryKey: ["client", id],
    queryFn: () => api<ClientDetail>(`/api/clients/${id}`),
    enabled: !!id,
  });
}

export function usePayments() {
  return useQuery<PaymentDTO[]>({
    queryKey: ["payments"],
    queryFn: () => api<PaymentDTO[]>("/api/payments"),
  });
}

export function useReports() {
  return useQuery<ReportsDTO>({
    queryKey: ["reports"],
    queryFn: () => api<ReportsDTO>("/api/reports"),
  });
}

// ── mutations ───────────────────────────────────────────────────────
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["loans"] });
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["loan"] });
    qc.invalidateQueries({ queryKey: ["client"] });
  };
}

export function useCreateClient() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api("/api/clients", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: invalidate,
  });
}

export function useUpdateClient() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: invalidate,
  });
}

export function useDeleteClient() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/clients/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useCreateLoan() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api<LoanDTO>("/api/loans", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: invalidate,
  });
}

export function useDeleteLoan() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api(`/api/loans/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useCreatePayment() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api("/api/payments", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: invalidate,
  });
}

export function useDeletePayment() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/payments/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SettingsDTO) =>
      api<SettingsDTO>("/api/settings", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (s) => qc.setQueryData(["settings"], s),
  });
}
