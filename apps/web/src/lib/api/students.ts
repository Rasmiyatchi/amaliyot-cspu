import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Paginated, Student, StudentStatus, UUID } from "@/lib/api/types";

export type CredentialsUpdate = {
  username?: string;
  password?: string;
};

export type StudentFilters = {
  faculty_id?: UUID;
  direction_id?: UUID;
  group_id?: UUID;
  course?: number;
  academic_year_id?: UUID;
  status?: StudentStatus;
  search?: string;
};

export const studentKeys = {
  all: ["students"] as const,
  list: (filters: StudentFilters, page: number, pageSize: number) =>
    [...studentKeys.all, "list", filters, page, pageSize] as const,
  detail: (id: UUID) => [...studentKeys.all, "detail", id] as const,
};

function toQueryString(filters: StudentFilters, page: number, pageSize: number): string {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("page_size", String(pageSize));
  if (filters.faculty_id) qs.set("faculty_id", filters.faculty_id);
  if (filters.direction_id) qs.set("direction_id", filters.direction_id);
  if (filters.group_id) qs.set("group_id", filters.group_id);
  if (filters.course !== undefined) qs.set("course", String(filters.course));
  if (filters.academic_year_id) qs.set("academic_year_id", filters.academic_year_id);
  if (filters.status) qs.set("status", filters.status);
  if (filters.search) qs.set("search", filters.search);
  return qs.toString();
}

export function useStudents(filters: StudentFilters = {}, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: studentKeys.list(filters, page, pageSize),
    queryFn: () =>
      api.get(`v1/students?${toQueryString(filters, page, pageSize)}`).json<Paginated<Student>>(),
    placeholderData: (prev) => prev, // pagination/filter paytida eski data ko'rinadi
  });
}

export function useStudent(id: UUID | null) {
  return useQuery({
    queryKey: id ? studentKeys.detail(id) : [],
    enabled: !!id,
    queryFn: () => api.get(`v1/students/${id}`).json<Student>(),
  });
}

export function useResetStudentDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      api.post(`v1/students/${id}/reset-device`).json<Student>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useUpdateStudentCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: CredentialsUpdate }) =>
      api.patch(`v1/students/${id}/credentials`, { json: data }).json<Student>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export type StudentCreatePayload = {
  hemis_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: "male" | "female" | null;
  region?: string | null;
  district?: string | null;
  group_id: UUID;
  current_semester?: number | null;
  is_graduating?: boolean;
  education_language?: string | null;
  education_form?: string | null;
  degree_type?: string | null;
};

export type StudentUpdatePayload = Partial<Omit<StudentCreatePayload, "hemis_id">> & {
  /** Amaliyot ID — import xato ID bilan kelsa admin tuzatadi (unique) */
  hemis_id?: string;
  enrollment_year?: number | null;
  status?: StudentStatus;
};

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StudentCreatePayload) =>
      api.post("v1/students", { json: data }).json<Student>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: StudentUpdatePayload }) =>
      api.patch(`v1/students/${id}`, { json: data }).json<Student>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/students/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export type StudentBulkDeleteResult = {
  requested: number;
  deleted: number;
  failed: { id: UUID; full_name: string | null; error: string }[];
};

/** Ko'p tanlangan talabalarni o'chirish — qisman muvaffaqiyat bo'lishi mumkin. */
export function useBulkDeleteStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: UUID[]) =>
      api
        .post("v1/students/bulk-delete", { json: { ids }, timeout: 120_000 })
        .json<StudentBulkDeleteResult>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}
