import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  AcademicYear,
  AcademicYearCreate,
  Direction,
  DirectionCreate,
  Faculty,
  FacultyCreate,
  Group,
  GroupCreate,
  Paginated,
  UUID,
} from "@/lib/api/types";

// ─── Keys ─────────────────────────────────────────────────
export const academicKeys = {
  all: ["academic"] as const,
  faculties: () => [...academicKeys.all, "faculties"] as const,
  directions: (facultyId?: UUID) => [...academicKeys.all, "directions", facultyId ?? "all"] as const,
  academicYears: () => [...academicKeys.all, "academic-years"] as const,
  groups: (filters?: {
    directionId?: UUID;
    academicYearId?: UUID;
    course?: number;
  }) => [...academicKeys.all, "groups", filters ?? {}] as const,
};

// ─── Faculties ────────────────────────────────────────────
export function useFaculties(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: [...academicKeys.faculties(), page, pageSize],
    queryFn: () =>
      api
        .get(`v1/academic/faculties?page=${page}&page_size=${pageSize}`)
        .json<Paginated<Faculty>>(),
  });
}

export function useCreateFaculty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FacultyCreate) =>
      api.post("v1/academic/faculties", { json: data }).json<Faculty>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.faculties() }),
  });
}

export function useUpdateFaculty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<FacultyCreate> }) =>
      api.patch(`v1/academic/faculties/${id}`, { json: data }).json<Faculty>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.faculties() }),
  });
}

export function useDeleteFaculty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/academic/faculties/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.all }),
  });
}

// ─── Directions ───────────────────────────────────────────
export function useDirections(facultyId?: UUID, page = 1, pageSize = 100) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("page_size", String(pageSize));
  if (facultyId) qs.set("faculty_id", facultyId);
  return useQuery({
    queryKey: [...academicKeys.directions(facultyId), page, pageSize],
    queryFn: () => api.get(`v1/academic/directions?${qs}`).json<Paginated<Direction>>(),
  });
}

export function useCreateDirection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DirectionCreate) =>
      api.post("v1/academic/directions", { json: data }).json<Direction>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.all }),
  });
}

export function useUpdateDirection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<DirectionCreate> }) =>
      api.patch(`v1/academic/directions/${id}`, { json: data }).json<Direction>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.all }),
  });
}

export function useDeleteDirection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/academic/directions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.all }),
  });
}

// ─── Academic Years ───────────────────────────────────────
export function useAcademicYears() {
  return useQuery({
    queryKey: academicKeys.academicYears(),
    queryFn: () => api.get("v1/academic/academic-years").json<AcademicYear[]>(),
  });
}

export function useCreateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AcademicYearCreate) =>
      api.post("v1/academic/academic-years", { json: data }).json<AcademicYear>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.academicYears() }),
  });
}

export function useUpdateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<AcademicYearCreate> }) =>
      api.patch(`v1/academic/academic-years/${id}`, { json: data }).json<AcademicYear>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.academicYears() }),
  });
}

export function useDeleteAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/academic/academic-years/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.academicYears() }),
  });
}

// ─── Groups ───────────────────────────────────────────────
export function useGroups(
  filters: { directionId?: UUID; academicYearId?: UUID; course?: number } = {},
  page = 1,
  pageSize = 100,
) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("page_size", String(pageSize));
  if (filters.directionId) qs.set("direction_id", filters.directionId);
  if (filters.academicYearId) qs.set("academic_year_id", filters.academicYearId);
  if (filters.course !== undefined) qs.set("course", String(filters.course));
  return useQuery({
    queryKey: [...academicKeys.groups(filters), page, pageSize],
    queryFn: () => api.get(`v1/academic/groups?${qs}`).json<Paginated<Group>>(),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GroupCreate) =>
      api.post("v1/academic/groups", { json: data }).json<Group>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.all }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<GroupCreate> }) =>
      api.patch(`v1/academic/groups/${id}`, { json: data }).json<Group>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.all }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/academic/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.all }),
  });
}
