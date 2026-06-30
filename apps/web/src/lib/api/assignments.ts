import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  AssignmentStatus,
  BulkAssignmentResult,
  Paginated,
  PracticeAssignment,
  PracticeAssignmentBulkCreate,
  PracticeAssignmentCreate,
  UUID,
} from "@/lib/api/types";

export type AssignmentFilters = {
  student_id?: UUID;
  practice_type_id?: UUID;
  academic_year_id?: UUID;
  organization_id?: UUID;
  area_id?: UUID;
  supervisor_id?: UUID;
  direction_id?: UUID;
  course?: number;
  group_id?: UUID;
  status?: AssignmentStatus;
  search?: string;
};

export const assignmentKeys = {
  all: ["assignments"] as const,
  list: (f: AssignmentFilters, page: number, pageSize: number) =>
    [...assignmentKeys.all, "list", f, page, pageSize] as const,
  detail: (id: UUID) => [...assignmentKeys.all, "detail", id] as const,
};

function qs(filters: AssignmentFilters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  if (filters.student_id) p.set("student_id", filters.student_id);
  if (filters.practice_type_id) p.set("practice_type_id", filters.practice_type_id);
  if (filters.academic_year_id) p.set("academic_year_id", filters.academic_year_id);
  if (filters.organization_id) p.set("organization_id", filters.organization_id);
  if (filters.area_id) p.set("area_id", filters.area_id);
  if (filters.supervisor_id) p.set("supervisor_id", filters.supervisor_id);
  if (filters.direction_id) p.set("direction_id", filters.direction_id);
  if (filters.course !== undefined) p.set("course", String(filters.course));
  if (filters.group_id) p.set("group_id", filters.group_id);
  if (filters.status) p.set("status", filters.status);
  if (filters.search) p.set("search", filters.search);
  return p.toString();
}

export function useAssignments(filters: AssignmentFilters = {}, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: assignmentKeys.list(filters, page, pageSize),
    queryFn: () =>
      api
        .get(`v1/practice-assignments?${qs(filters, page, pageSize)}`)
        .json<Paginated<PracticeAssignment>>(),
    placeholderData: (prev) => prev,
  });
}

export function useMyAssignments() {
  return useQuery({
    queryKey: [...assignmentKeys.all, "my"] as const,
    queryFn: () =>
      api.get("v1/practice-assignments/my").json<PracticeAssignment[]>(),
  });
}

export function useAssignment(id: UUID | null) {
  return useQuery({
    queryKey: id ? assignmentKeys.detail(id) : [],
    enabled: !!id,
    queryFn: () =>
      api.get(`v1/practice-assignments/${id}`).json<PracticeAssignment>(),
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PracticeAssignmentCreate) =>
      api.post("v1/practice-assignments", { json: data }).json<PracticeAssignment>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}

export function useBulkCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PracticeAssignmentBulkCreate) =>
      api
        .post("v1/practice-assignments/bulk", { json: data })
        .json<BulkAssignmentResult>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<PracticeAssignmentCreate> & { status?: AssignmentStatus; cancelled_reason?: string } }) =>
      api.patch(`v1/practice-assignments/${id}`, { json: data }).json<PracticeAssignment>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/practice-assignments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}
