import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import i18n from "@/i18n";
import {
  api,
  authFetch,
  downloadFile,
  filenameFromDisposition,
  readErrorDetail,
  saveBlob,
} from "@/lib/api";
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
export function downloadContractPdf(id: UUID, number: string): Promise<void> {
  return downloadFile(
    `/api/v1/contracts/${id}/pdf`,
    `${number}.pdf`,
    i18n.t("contractsContractDetailDialog.pdfDownloadFailed"),
  );
}

/** Shartnoma skanini yangi oynada ochadi (brauzer bloklasa — yuklab oladi). */
export async function downloadContractScan(id: UUID, number: string): Promise<void> {
  // Oyna so'rovdan OLDIN ochiladi — await'dan keyin ochilsa popup bloker to'sadi
  const win = window.open("", "_blank");
  let blob: Blob;
  let disposition: string | null;
  try {
    const res = await authFetch(`/api/v1/contracts/${id}/scan`);
    if (!res.ok) throw new Error(await readErrorDetail(res, i18n.t("common.downloadFailed")));
    disposition = res.headers.get("content-disposition");
    blob = await res.blob();
  } catch (e) {
    // Tarmoq xatosida ham bo'sh oyna ochiq qolmasin
    win?.close();
    throw e instanceof Error ? e : new Error(i18n.t("common.downloadFailed"));
  }
  if (win) {
    const url = URL.createObjectURL(blob);
    win.location.href = url;
    // Oyna yuklab bo'lgach URL'ni bo'shatamiz
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  saveBlob(
    blob,
    filenameFromDisposition(disposition, `${number}_scan`),
  );
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
    queryKey: contractKeys.detail(id ?? ""),
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

export function useArchiveContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      api.post(`v1/contracts/${id}/archive`).json<Contract>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.all }),
  });
}

export function useUnarchiveContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      api.post(`v1/contracts/${id}/unarchive`).json<Contract>(),
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

/** Ochiq QR tekshiruvi xatosi: `notFound` — shartnoma yo'q; aks holda tarmoq/server xatosi. */
export class VerifyContractError extends Error {
  readonly notFound: boolean;

  constructor(message: string, notFound: boolean) {
    super(message);
    this.name = "VerifyContractError";
    this.notFound = notFound;
  }
}

// Ochiq tekshiruv (auth talab qilinmaydi — ky'siz). Faqat 404 "topilmadi" deb hisoblanadi:
// server vaqtincha ishlamasa, tashqi tekshiruvchiga "shartnoma yo'q" degan noto'g'ri xulosa
// ko'rsatilmasligi kerak.
export function useVerifyContract(token: string | null) {
  return useQuery({
    queryKey: ["verify", token],
    enabled: !!token,
    retry: (failureCount, error) =>
      !(error instanceof VerifyContractError && error.notFound) && failureCount < 2,
    queryFn: async () => {
      let res: Response;
      try {
        res = await fetch(`/api/v1/verify/${encodeURIComponent(token ?? "")}`, {
          credentials: "omit",
        });
      } catch {
        throw new VerifyContractError(i18n.t("verify.checkFailed"), false);
      }
      if (res.status === 404) {
        throw new VerifyContractError(i18n.t("common.contractNotFound"), true);
      }
      if (!res.ok) {
        throw new VerifyContractError(i18n.t("verify.checkFailed"), false);
      }
      return (await res.json()) as ContractVerifyResponse;
    },
  });
}
