import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
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

/** Admin uchun: tasdiqlashdan oldin shartnoma PDF ko'rish (preview). */
export async function previewContractPdf(id: UUID): Promise<string> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error(i18n.t("common.sessionExpired"));
  const res = await fetch(`/api/v1/practice-applications/${id}/preview-pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(i18n.t("adminApplications.previewLoadFailed", { status: res.status }));
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Tasdiqlangan shartnoma PDF/DOCX faylini yuklab oladi. */
export async function downloadContract(id: UUID, number: string | null): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error(i18n.t("common.sessionExpired"));
  const res = await fetch(`/api/v1/practice-applications/${id}/contract.pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    // try fallback docx if pdf not found
    const res2 = await fetch(`/api/v1/practice-applications/${id}/contract.docx`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res2.ok) throw new Error(`Yuklab bo'lmadi (${res2.status})`);
    const blob = await res2.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${number ?? "shartnoma"}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${number ?? "shartnoma"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadApplicationScan(id: UUID): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error(i18n.t("common.sessionExpired"));
  const res = await fetch(`/api/v1/practice-applications/${id}/scan`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Yuklab bo'lmadi (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank"); // O'zgartirildi: skan yangi tabda ochiladi
  setTimeout(() => URL.revokeObjectURL(url), 10000);
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
      return api.post(`v1/practice-applications/${id}/upload-scan`, { body: fd }).json<PracticeApplication>();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// ─── Admin ────────────────────────────────────────────────
export function useApplications(filters: { status?: ApplicationStatus; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.search) qs.set("search", filters.search);
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

/** Admin uchun: tasdiqlangan va shartnoma fayli mavjud arizalar ro'yxati. */
export function useApprovedContracts(search?: string) {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  return useQuery({
    queryKey: [...KEY, "approved-contracts", search],
    queryFn: () =>
      api.get(`v1/practice-applications/approved-contracts?${qs}`).json<PracticeApplication[]>(),
    placeholderData: (prev) => prev,
  });
}
