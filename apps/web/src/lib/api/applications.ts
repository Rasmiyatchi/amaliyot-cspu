import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { UUID } from "@/lib/api/types";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export type PracticeApplication = {
  id: UUID;
  student_id: UUID;
  student_name: string | null;
  direction_name: string | null;
  group_name: string | null;
  course: number | null;
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
