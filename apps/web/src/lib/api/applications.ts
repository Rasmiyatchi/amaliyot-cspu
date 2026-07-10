import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { UUID } from "@/lib/api/types";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export type ContractType = {
  id: UUID;
  name: string;
  description: string | null;
  practice_type_id: UUID | null;
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
  object_name: string;
  object_location: string;
  manager_name: string | null;
  manager_phone: string;
  region: string | null;
  district: string | null;
  note: string | null;
  status: ApplicationStatus;
  qr_token: string | null;
  reviewed_by_id: UUID | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationCreate = {
  contract_template_id?: UUID;
  object_name: string;
  object_location: string;
  manager_name?: string;
  manager_phone: string;
  region?: string;
  district?: string;
  note?: string;
};

export type AppendixGroup = {
  region: string;
  count: number;
  students: {
    student_name: string | null;
    direction_name: string | null;
    course: number | null;
    object_name: string;
    object_location: string;
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

/** Tasdiqlangan shartnoma DOCX faylini yuklab oladi. */
export async function downloadContract(id: UUID, number: string | null): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error("Sessiya tugagan");
  const res = await fetch(`/api/v1/practice-applications/${id}/contract.docx`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Yuklab bo'lmadi (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${number ?? "shartnoma"}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
