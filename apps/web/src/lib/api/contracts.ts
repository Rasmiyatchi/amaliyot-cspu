import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type {
  Contract,
  ContractCreate,
  ContractStatus,
  ContractVerifyResponse,
  Paginated,
  UUID,
} from "@/lib/api/types";

export type ContractFilters = {
  organization_id?: UUID;
  practice_type_id?: UUID;
  academic_year_id?: UUID;
  status?: ContractStatus[];
  search?: string;
};

export const contractKeys = {
  all: ["contracts"] as const,
  list: (f: ContractFilters, page: number, pageSize: number) =>
    [...contractKeys.all, "list", f, page, pageSize] as const,
  detail: (id: UUID) => [...contractKeys.all, "detail", id] as const,
};

function qs(filters: ContractFilters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  if (filters.organization_id) p.set("organization_id", filters.organization_id);
  if (filters.practice_type_id) p.set("practice_type_id", filters.practice_type_id);
  if (filters.academic_year_id) p.set("academic_year_id", filters.academic_year_id);
  if (filters.status) filters.status.forEach((s) => p.append("status", s));
  if (filters.search) p.set("search", filters.search);
  return p.toString();
}

/** Shartnoma PDF'ini autentifikatsiya bilan yuklab oladi. */
export async function downloadContractPdf(id: UUID, number: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error(i18n.t("common.sessionExpired"));
  const res = await fetch(`/api/v1/contracts/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`PDF yuklab bo'lmadi (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useContracts(filters: ContractFilters = {}, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: contractKeys.list(filters, page, pageSize),
    queryFn: () =>
      api.get(`v1/contracts?${qs(filters, page, pageSize)}`).json<Paginated<Contract>>(),
    placeholderData: (prev) => prev,
  });
}

export function useContract(id: UUID | null) {
  return useQuery({
    queryKey: id ? contractKeys.detail(id) : [],
    enabled: !!id,
    queryFn: () => api.get(`v1/contracts/${id}`).json<Contract>(),
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContractCreate) =>
      api.post("v1/contracts", { json: data }).json<Contract>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.all }),
  });
}

export function useGenerateContractPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      api.post(`v1/contracts/${id}/generate`).json<Contract>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.all }),
  });
}

export function useUploadContractScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: UUID; file: File }) => {
      const fd = new FormData();
      fd.append("file", file);
      return api
        .post(`v1/contracts/${id}/upload-scan`, { body: fd, timeout: 60_000 })
        .json<Contract>();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.all }),
  });
}

export function useRevokeContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: UUID; reason: string }) =>
      api.post(`v1/contracts/${id}/revoke`, { json: { reason } }).json<Contract>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.all }),
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/contracts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.all }),
  });
}

// Public verify (auth talab qilmaydi — ky bypass qilamiz)
export function useVerifyContract(token: string | null) {
  return useQuery({
    queryKey: ["verify", token],
    enabled: !!token,
    queryFn: async () => {
      let res = await fetch(`/api/v1/verify/${token}`, { credentials: "omit" });
      if (!res.ok) {
        res = await fetch(`/verify/${token}`, { credentials: "omit" });
      }
      if (!res.ok) throw new Error(i18n.t("common.contractNotFound"));
      return (await res.json()) as ContractVerifyResponse;
    },
  });
}
