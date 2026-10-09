import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { bulkDeleteInBatches } from "@/lib/api/bulk-delete";
import type {
  DegreeType,
  EducationForm,
  Gender,
  Paginated,
  Student,
  StudentStatus,
  UUID,
} from "@/lib/api/types";

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
  has_assignment?: boolean;
  /** Qurilmasi bog'langanlar (true) / bog'lanmaganlar (false) */
  has_device?: boolean;
};

export const studentKeys = {
  all: ["students"] as const,
  lists: () => [...studentKeys.all, "list"] as const,
  list: (filters: StudentFilters, page: number, pageSize: number) =>
    [...studentKeys.lists(), filters, page, pageSize] as const,
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
  if (filters.has_assignment !== undefined) qs.set("has_assignment", String(filters.has_assignment));
  if (filters.has_device !== undefined) qs.set("has_device", String(filters.has_device));
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
    queryKey: studentKeys.detail(id ?? ""),
    enabled: !!id,
    queryFn: () => api.get(`v1/students/${id}`).json<Student>(),
  });
}

/**
 * Talaba o'zgargach: detal keshini server javobi bilan darhol yangilaymiz (ochiq dialog
 * eski ma'lumotni ko'rsatib turmasin) va ro'yxatlarni qayta so'raymiz.
 */
function useStudentSaved() {
  const qc = useQueryClient();
  return (student: Student) => {
    qc.setQueryData(studentKeys.detail(student.id), student);
    return qc.invalidateQueries({ queryKey: studentKeys.lists() });
  };
}

export function useResetStudentDevice() {
  const onSaved = useStudentSaved();
  return useMutation({
    mutationFn: (id: UUID) => api.post(`v1/students/${id}/reset-device`).json<Student>(),
    onSuccess: onSaved,
  });
}

export function useUpdateStudentCredentials() {
  const onSaved = useStudentSaved();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: CredentialsUpdate }) =>
      api.patch(`v1/students/${id}/credentials`, { json: data }).json<Student>(),
    onSuccess: onSaved,
  });
}

/** Backend `StudentCreate` bilan bir xil maydonlar (qolganlari server tomonidan e'tiborsiz). */
export type StudentCreatePayload = {
  hemis_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: Gender | null;
  region?: string | null;
  district?: string | null;
  group_id: UUID;
  current_semester?: number | null;
  /** Qabul yili — login prefiksi va kurs hisobi uchun */
  enrollment_year?: number | null;
  is_graduating?: boolean;
  education_language?: string | null;
  education_form?: EducationForm | null;
  degree_type?: DegreeType | null;
};

export type StudentUpdatePayload = Partial<Omit<StudentCreatePayload, "hemis_id">> & {
  /** Amaliyot ID — import xato ID bilan kelsa admin tuzatadi (unique) */
  hemis_id?: string;
  status?: StudentStatus;
};

export function useCreateStudent() {
  const onSaved = useStudentSaved();
  return useMutation({
    mutationFn: (data: StudentCreatePayload) =>
      api.post("v1/students", { json: data }).json<Student>(),
    onSuccess: onSaved,
  });
}

export function useUpdateStudent() {
  const onSaved = useStudentSaved();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: StudentUpdatePayload }) =>
      api.patch(`v1/students/${id}`, { json: data }).json<Student>(),
    onSuccess: onSaved,
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/students/${id}`),
    onSuccess: (_res, id) => {
      // O'chirilgan talabaning detalini qayta so'ramaslik uchun (404 bo'lardi)
      qc.removeQueries({ queryKey: studentKeys.detail(id), exact: true });
      return qc.invalidateQueries({ queryKey: studentKeys.lists() });
    },
  });
}

export type StudentBulkDeleteResult = {
  requested: number;
  deleted: number;
  failed: { id: UUID; full_name: string | null; error: string }[];
};



/** Backend chegarasi: bir so'rovda 200 ta (StudentBulkDeleteRequest). */
const STUDENT_BULK_MAX = 200;

/** Ko'p tanlangan talabalarni o'chirish — qisman muvaffaqiyat bo'lishi mumkin. */
export function useBulkDeleteStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: UUID[]) =>
      bulkDeleteInBatches(ids, STUDENT_BULK_MAX, (chunk) =>
        api
          .post("v1/students/bulk-delete", { json: { ids: chunk }, timeout: 120_000 })
          .json<StudentBulkDeleteResult>(),
      ),
    // Qisman bajarilgan bo'lsa ham ro'yxat yangilansin
    onSettled: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

// ─── Bog'langan qurilmalarni ommaviy uzish (TZ 08.10.2026) ────────────

export type DeviceResetScope = "all" | "faculty" | "group" | "students";

export type DeviceResetRequest = {
  scope: DeviceResetScope;
  faculty_id?: UUID | null;
  group_id?: UUID | null;
  student_ids?: UUID[];
  /** Qo'llashda majburiy — admin tasdig'i */
  confirm?: boolean;
  dry_run: boolean;
};

export type DeviceResetResult = {
  dry_run: boolean;
  scope: DeviceResetScope;
  students_total: number;
  bound: number;
  reset: number;
  faculty_name: string | null;
  group_name: string | null;
};

/** `dry_run: true` — faqat nechta qurilma uzilishini hisoblaydi. */
export function useBulkResetDevices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DeviceResetRequest) =>
      api
        .post("v1/students/bulk-reset-device", { json: data, timeout: 120_000 })
        .json<DeviceResetResult>(),
    onSuccess: (res) => {
      if (!res.dry_run) void qc.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
}
