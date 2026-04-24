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

export function useUpdateStudentCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: CredentialsUpdate }) =>
      api.patch(`v1/students/${id}/credentials`, { json: data }).json<Student>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}
