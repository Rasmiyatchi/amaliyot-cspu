import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import i18n from "@/i18n";
import { api, authFetch, downloadFile, readErrorDetail } from "@/lib/api";
import type { UUID } from "@/lib/api/types";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "revision_required"
  | "resubmitted"
  | "approved"
  | "active"
  | "rejected"
  | "expired"
  | "archived";

export type ContractType = {
  id: UUID;
  name: string;
  description: string | null;
  practice_type_id: UUID | null;
  placeholders: string[];
};

export type TemplateFormField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
  placeholder: string | null;
  defaultValue: string | null;
};

export type TemplateFormResponse = {
  templateId: string;
  templateName: string;
  fields: TemplateFormField[];
};

export type PracticeApplication = {
  id: UUID;
  student_id: UUID;
  student_name: string | null;
  direction_name: string | null;
  group_name: string | null;
  course: number | null;
  contract_template_id: UUID | null;
  contract_template_name: string | null;
  contract_number: string | null;
  has_contract_file: boolean;
  has_scan_file: boolean;
  contract_file: { name: string; path: string; mime: string; size: number } | null;
  scan_file: { name: string; path: string; mime: string; size: number } | null;
  organization_type: string;
  organization_name: string;
  region: string | null;
  district: string | null;
  note: string | null;
  status: ApplicationStatus;
  qr_token: string | null;
  variable_values: Record<string, unknown> | null;
  reviewed_by_id: UUID | null;
  reviewed_at: string | null;
  review_note: string | null;
  return_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationCreate = {
  contract_template_id?: UUID;
  organization_type?: string;
  organization_name?: string;
  region?: string;
  district?: string;
  note?: string;
  placeholders_data?: Record<string, string>;
  variable_values?: Record<string, string>;
};

export type AppendixGroup = {
  region: string;
  count: number;
  students: {
    student_name: string | null;
    direction_name: string | null;
    course: number | null;
    organization_name: string;
  }[];
};

const KEY = ["applications"] as const;

// ─── Talaba ───────────────────────────────────────────────
export function useMyApplications() {
  return useQuery({
    queryKey: [...KEY, "my"],
    queryFn: () => api.get("v1/practice-applications/my").json<PracticeApplication[]>(),
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplicationCreate) =>
      api.post("v1/practice-applications", { json: data }).json<PracticeApplication>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Talaba tanlashi mumkin bo'lgan shartnoma turlari (faol shablonlar). */
export function useContractTypes() {
  return useQuery({
    queryKey: [...KEY, "contract-types"],
    queryFn: () =>
      api.get("v1/practice-applications/contract-types").json<ContractType[]>(),
  });
}

/** Tanlangan shablon bo'yicha dinamik forma maydonlarini olish. */
export function useTemplateFormFields(templateId: UUID | null | undefined) {
  return useQuery({
    queryKey: [...KEY, "template-fields", templateId],
    queryFn: () =>
      api.get(`v1/contract-templates/${templateId}/form-fields`).json<TemplateFormResponse>(),
    enabled: !!templateId,
  });
}

/**
 * Admin uchun: tasdiqlashdan oldin shartnoma PDF ko'rish (preview).
 * Qaytgan object URL'ni chaqiruvchi `URL.revokeObjectURL` bilan bo'shatishi kerak.
 */
export async function previewContractPdf(id: UUID): Promise<string> {
  const res = await authFetch(`/api/v1/practice-applications/${id}/preview-pdf`);
  if (!res.ok) {
    throw new Error(
      await readErrorDetail(
        res,
        i18n.t("adminApplications.previewLoadFailed", { status: res.status }),
      ),
    );
  }
  return URL.createObjectURL(await res.blob());
}

/**
 * Tasdiqlangan shartnoma faylini yuklab oladi. Server fayl qaysi formatda saqlangan
 * bo'lsa (PDF yoki DOCX) shunday qaytaradi — nomi Content-Disposition'dan olinadi.
 */
export function downloadContract(id: UUID, number: string | null): Promise<void> {
  return downloadFile(
    `/api/v1/practice-applications/${id}/contract.pdf`,
    `${number ?? "shartnoma"}.pdf`,
    i18n.t("common.downloadFailed"),
  );
}

/** Imzolangan skan manzili — ilova ichida ko'rish (FilePreviewModal) va yuklab olish uchun. */
export function applicationScanUrl(id: UUID): string {
  return `/api/v1/practice-applications/${id}/scan`;
}

/** Ariza bo'yicha yuklangan imzolangan skan nusxani yuklab oladi. */
export function downloadApplicationScan(id: UUID, fileName?: string): Promise<void> {
  return downloadFile(
    applicationScanUrl(id),
    fileName || `shartnoma_skan_${id}.pdf`,
    i18n.t("common.downloadFailed"),
  );
}

/** Talaba: tuzatishga qaytarilgan arizani to'g'irlab qayta yuborish. */
export function useResubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, variable_values }: { id: UUID; variable_values?: Record<string, unknown> | null }) =>
      api
        .post(`v1/practice-applications/${id}/resubmit`, { json: { variable_values: variable_values ?? null } })
        .json<PracticeApplication>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUploadApplicationScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: UUID; file: File }) => {
      const fd = new FormData();
      fd.append("file", file);
      return api
        .post(`v1/practice-applications/${id}/upload-scan`, { body: fd, timeout: 120_000 })
        .json<PracticeApplication>();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// ─── Admin ────────────────────────────────────────────────
export function useApplications(filters: { status?: ApplicationStatus; search?: string; includeArchived?: boolean } = {}) {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.search) qs.set("search", filters.search);
  if (filters.includeArchived) qs.set("include_archived", "true");
  return useQuery({
    queryKey: [...KEY, "all", filters],
    queryFn: () =>
      api.get(`v1/practice-applications?${qs}`).json<PracticeApplication[]>(),
    placeholderData: (prev) => prev,
  });
}

export function useAppendix() {
  return useQuery({
    queryKey: [...KEY, "appendix"],
    queryFn: () => api.get("v1/practice-applications/appendix").json<AppendixGroup[]>(),
  });
}

export function useApproveApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      api.post(`v1/practice-applications/${id}/approve`).json<PracticeApplication>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRejectApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, review_note }: { id: UUID; review_note?: string }) =>
      api
        .post(`v1/practice-applications/${id}/reject`, { json: { review_note } })
        .json<PracticeApplication>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useReturnApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, return_reason }: { id: UUID; return_reason: string }) =>
      api
        .post(`v1/practice-applications/${id}/return`, { json: { return_reason } })
        .json<PracticeApplication>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Admin: imzolangan skanni tasdiqlash — shartnoma yopiladi (ACTIVE). */
export function useConfirmScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      api.post(`v1/practice-applications/${id}/confirm-scan`).json<PracticeApplication>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Admin: arizani arxivlash (status -> ARCHIVED). */
export function useArchiveApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      api.post(`v1/practice-applications/${id}/archive`).json<PracticeApplication>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Admin: arizani arxivdan chiqarish (status -> APPROVED/ACTIVE). */
export function useUnarchiveApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      api.post(`v1/practice-applications/${id}/unarchive`).json<PracticeApplication>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Admin: arizani butunlay o'chirish. */
export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/practice-applications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Admin uchun: tasdiqlangan va shartnoma fayli mavjud arizalar ro'yxati. */
export function useApprovedContracts(
  search?: string,
  statuses?: ApplicationStatus[]
) {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (statuses && statuses.length > 0) {
    statuses.forEach((s) => qs.append("status", s));
  }
  return useQuery({
    queryKey: [...KEY, "approved-contracts", search, statuses],
    queryFn: () =>
      api.get(`v1/practice-applications/approved-contracts?${qs}`).json<PracticeApplication[]>(),
    placeholderData: (prev) => prev,
  });
}
