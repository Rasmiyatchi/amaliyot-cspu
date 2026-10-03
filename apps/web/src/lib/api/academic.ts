import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  AcademicYear,
  AcademicYearCreate,
  Department,
  DepartmentCreate,
  Direction,
  DirectionCreate,
  Faculty,
  FacultyCreate,
  Group,
  GroupCreate,
  Paginated,
  UUID,
} from "@/lib/api/types";

export type GroupFilters = {
  directionId?: UUID;
  academicYearId?: UUID;
  course?: number;
};

/** Ro'yxat so'rovlari uchun qo'shimcha sozlamalar (mavjud chaqiruvlar uchun ixtiyoriy). */
export type ListQueryOptions = {
  enabled?: boolean;
  /** Sahifa/filtr almashganda yangi javob kelguncha eski ma'lumot ko'rinib tursin */
  keepPrevious?: boolean;
};

// ─── Keys ─────────────────────────────────────────────────
export const academicKeys = {
  all: ["academic"] as const,
  faculties: () => [...academicKeys.all, "faculties"] as const,
  directions: (facultyId?: UUID) => [...academicKeys.all, "directions", facultyId ?? "all"] as const,
  departments: (facultyId?: UUID) =>
    [...academicKeys.all, "departments", facultyId ?? "all"] as const,
  academicYears: () => [...academicKeys.all, "academic-years"] as const,
  groups: (filters?: GroupFilters) => [...academicKeys.all, "groups", filters ?? {}] as const,
};

/** Backend `page_size` yuqori chegaralari (le=...) — undan kattasi 422 qaytaradi. */
const MAX_PAGE_SIZE = {
  faculties: 100,
  directions: 200,
  departments: 200,
  groups: 200,
} as const;

/** "Barcha sahifalar" so'rovlari kalitining oxirgi qismi. */
const COMPLETE = "complete";

function buildQuery(params: Record<string, string | undefined>, page: number, pageSize: number) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("page_size", String(pageSize));
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, value);
  }
  return qs.toString();
}

/**
 * Ro'yxatni to'liq yuklaydi: birinchi sahifadan `total`ni bilib, qolgan sahifalarni
 * parallel so'raydi. Tanlash ro'yxatlari (picker) jim qirqilib qolmasligi uchun.
 */
async function fetchAllPages<T extends { id: UUID }>(
  path: string,
  params: Record<string, string | undefined>,
  pageSize: number,
): Promise<T[]> {
  const first = await api.get(`${path}?${buildQuery(params, 1, pageSize)}`).json<Paginated<T>>();
  const pageCount = Math.ceil(first.total / pageSize);
  if (pageCount <= 1) return first.items;
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, i) =>
      api.get(`${path}?${buildQuery(params, i + 2, pageSize)}`).json<Paginated<T>>(),
    ),
  );
  // Sahifalar orasida yozuv qo'shilsa takror chiqmasin
  const byId = new Map<UUID, T>();
  for (const page of [first, ...rest]) {
    for (const item of page.items) byId.set(item.id, item);
  }
  return [...byId.values()];
}

function groupParams(filters: GroupFilters): Record<string, string | undefined> {
  return {
    direction_id: filters.directionId,
    academic_year_id: filters.academicYearId,
    course: filters.course !== undefined ? String(filters.course) : undefined,
  };
}

// ─── Faculties ────────────────────────────────────────────
export function useFaculties(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: [...academicKeys.faculties(), page, pageSize],
    queryFn: () =>
      api
        .get(`v1/academic/faculties?${buildQuery({}, page, pageSize)}`)
        .json<Paginated<Faculty>>(),
  });
}

/** Barcha fakultetlar (sahifalab to'liq yuklanadi). */
export function useAllFaculties() {
  return useQuery({
    queryKey: [...academicKeys.faculties(), COMPLETE],
    queryFn: () => fetchAllPages<Faculty>("v1/academic/faculties", {}, MAX_PAGE_SIZE.faculties),
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
export function useDirections(
  facultyId?: UUID,
  page = 1,
  pageSize = 100,
  options: ListQueryOptions = {},
) {
  return useQuery({
    queryKey: [...academicKeys.directions(facultyId), page, pageSize],
    queryFn: () =>
      api
        .get(`v1/academic/directions?${buildQuery({ faculty_id: facultyId }, page, pageSize)}`)
        .json<Paginated<Direction>>(),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious ? (prev) => prev : undefined,
  });
}

/** Fakultet (yoki barcha) yo'nalishlari — to'liq ro'yxat. */
export function useAllDirections(facultyId?: UUID, options: ListQueryOptions = {}) {
  return useQuery({
    queryKey: [...academicKeys.directions(facultyId), COMPLETE],
    queryFn: () =>
      fetchAllPages<Direction>(
        "v1/academic/directions",
        { faculty_id: facultyId },
        MAX_PAGE_SIZE.directions,
      ),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious ? (prev) => prev : undefined,
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

// ─── Departments (Kafedra) ────────────────────────────────
export function useDepartments(
  facultyId?: UUID,
  page = 1,
  pageSize = 100,
  options: ListQueryOptions = {},
) {
  return useQuery({
    queryKey: [...academicKeys.departments(facultyId), page, pageSize],
    queryFn: () =>
      api
        .get(`v1/academic/departments?${buildQuery({ faculty_id: facultyId }, page, pageSize)}`)
        .json<Paginated<Department>>(),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious ? (prev) => prev : undefined,
  });
}

/** Fakultet (yoki barcha) kafedralari — to'liq ro'yxat. */
export function useAllDepartments(facultyId?: UUID, options: ListQueryOptions = {}) {
  return useQuery({
    queryKey: [...academicKeys.departments(facultyId), COMPLETE],
    queryFn: () =>
      fetchAllPages<Department>(
        "v1/academic/departments",
        { faculty_id: facultyId },
        MAX_PAGE_SIZE.departments,
      ),
    enabled: options.enabled ?? true,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DepartmentCreate) =>
      api.post("v1/academic/departments", { json: data }).json<Department>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.all }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<DepartmentCreate> }) =>
      api.patch(`v1/academic/departments/${id}`, { json: data }).json<Department>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKeys.all }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/academic/departments/${id}`),
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
  filters: GroupFilters = {},
  page = 1,
  pageSize = 100,
  options: ListQueryOptions = {},
) {
  return useQuery({
    queryKey: [...academicKeys.groups(filters), page, pageSize],
    queryFn: () =>
      api
        .get(`v1/academic/groups?${buildQuery(groupParams(filters), page, pageSize)}`)
        .json<Paginated<Group>>(),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious ? (prev) => prev : undefined,
  });
}

/** Filtrga mos barcha guruhlar — to'liq ro'yxat (tanlash ro'yxatlari va qidiruv uchun). */
export function useAllGroups(filters: GroupFilters = {}, options: ListQueryOptions = {}) {
  return useQuery({
    queryKey: [...academicKeys.groups(filters), COMPLETE],
    queryFn: () =>
      fetchAllPages<Group>("v1/academic/groups", groupParams(filters), MAX_PAGE_SIZE.groups),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious ? (prev) => prev : undefined,
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
