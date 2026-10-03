import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  AssignmentStatus,
  AttendanceApproveRequest,
  AttendanceBulkRangeSetResult,
  AttendanceDay,
  AttendanceDayDetail,
  AttendanceDaySetRequest,
  AttendanceDayStatus,
  AttendanceMarkRedRequest,
  AttendanceOverride,
  AttendanceOverrideRequest,
  AttendanceRangeSetRequest,
  AttendanceRangeSetResult,
  AttendanceRejectRequest,
  AttendanceSummaryRow,
  CheckInRequest,
  ISODate,
  Paginated,
  Semester,
  UUID,
} from "@/lib/api/types";

export type AttendanceFilters = {
  assignment_id?: UUID;
  student_id?: UUID;
  status?: AttendanceDayStatus;
  date_from?: ISODate;
  date_to?: ISODate;
  group_id?: UUID;
  direction_id?: UUID;
  faculty_id?: UUID;
  /** Talaba F.I.SH. / hemis_id / login */
  search?: string;
};

export type AttendanceSummarySort = "name" | "percent_asc" | "percent_desc" | "red_desc";

export type AttendanceSummaryFilters = {
  search?: string;
  faculty_id?: UUID;
  direction_id?: UUID;
  group_id?: UUID;
  academic_year_id?: UUID;
  practice_type_id?: UUID;
  semester?: Semester;
  /** default (server): active + draft */
  assignment_status?: AssignmentStatus;
  include_archived?: boolean;
  sort?: AttendanceSummarySort;
};

export const attendanceKeys = {
  all: ["attendance"] as const,
  days: (f: AttendanceFilters, page: number, pageSize: number) =>
    [...attendanceKeys.all, "days", f, page, pageSize] as const,
  day: (id: UUID) => [...attendanceKeys.all, "day", id] as const,
  overrides: (dayId: UUID) => [...attendanceKeys.all, "overrides", dayId] as const,
  today: (assignmentId: UUID) => [...attendanceKeys.all, "today", assignmentId] as const,
  summary: (f: AttendanceSummaryFilters, page: number, pageSize: number) =>
    [...attendanceKeys.all, "summary", f, page, pageSize] as const,
};

function qs(filters: AttendanceFilters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  if (filters.assignment_id) p.set("assignment_id", filters.assignment_id);
  if (filters.student_id) p.set("student_id", filters.student_id);
  if (filters.status) p.set("status", filters.status);
  if (filters.date_from) p.set("date_from", filters.date_from);
  if (filters.date_to) p.set("date_to", filters.date_to);
  if (filters.group_id) p.set("group_id", filters.group_id);
  if (filters.direction_id) p.set("direction_id", filters.direction_id);
  if (filters.faculty_id) p.set("faculty_id", filters.faculty_id);
  if (filters.search?.trim()) p.set("search", filters.search.trim());
  return p.toString();
}

function summaryQs(filters: AttendanceSummaryFilters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  if (filters.search?.trim()) p.set("search", filters.search.trim());
  if (filters.faculty_id) p.set("faculty_id", filters.faculty_id);
  if (filters.direction_id) p.set("direction_id", filters.direction_id);
  if (filters.group_id) p.set("group_id", filters.group_id);
  if (filters.academic_year_id) p.set("academic_year_id", filters.academic_year_id);
  if (filters.practice_type_id) p.set("practice_type_id", filters.practice_type_id);
  if (filters.semester) p.set("semester", filters.semester);
  if (filters.assignment_status) p.set("assignment_status", filters.assignment_status);
  if (filters.include_archived) p.set("include_archived", "true");
  if (filters.sort) p.set("sort", filters.sort);
  return p.toString();
}

export function useAttendanceDays(
  filters: AttendanceFilters = {},
  page = 1,
  pageSize = 50,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: attendanceKeys.days(filters, page, pageSize),
    queryFn: () =>
      api.get(`v1/attendance/days?${qs(filters, page, pageSize)}`).json<Paginated<AttendanceDay>>(),
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
  });
}

/** A1 — talaba-markazli jamlanma (admin + super_admin). */
export function useAttendanceSummary(
  filters: AttendanceSummaryFilters = {},
  page = 1,
  pageSize = 25,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: attendanceKeys.summary(filters, page, pageSize),
    queryFn: () =>
      api
        .get(`v1/attendance/summary?${summaryQs(filters, page, pageSize)}`)
        .json<Paginated<AttendanceSummaryRow>>(),
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
  });
}

export function useAttendanceDay(id: UUID | null) {
  return useQuery({
    queryKey: id ? attendanceKeys.day(id) : [],
    enabled: !!id,
    queryFn: () => api.get(`v1/attendance/days/${id}`).json<AttendanceDayDetail>(),
  });
}

export function useAttendanceOverrides(dayId: UUID | null) {
  return useQuery({
    queryKey: dayId ? attendanceKeys.overrides(dayId) : [],
    enabled: !!dayId,
    queryFn: () => api.get(`v1/attendance/days/${dayId}/overrides`).json<AttendanceOverride[]>(),
  });
}

export function useMarkRed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: UUID; data: AttendanceMarkRedRequest }) =>
      api
        .post(`v1/attendance/assignments/${assignmentId}/mark-red`, { json: data })
        .json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

export function useApproveDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: AttendanceApproveRequest }) =>
      api.post(`v1/attendance/days/${id}/approve`, { json: data }).json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

export function useRejectDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: AttendanceRejectRequest }) =>
      api.post(`v1/attendance/days/${id}/reject`, { json: data }).json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

export function useOverrideDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: AttendanceOverrideRequest }) =>
      api.post(`v1/attendance/days/${id}/override`, { json: data }).json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

/** A3 — sana bo'yicha bitta kunni yaratish/yangilash (super_admin). Kelajak sana = oldindan tasdiq. */
export function useSetAttendanceDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      day,
      data,
    }: {
      assignmentId: UUID;
      day: ISODate;
      data: AttendanceDaySetRequest;
    }) =>
      api
        .put(`v1/attendance/assignments/${assignmentId}/days/${day}`, { json: data })
        .json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

/** A4 — mavjud kunni id bo'yicha yangilash (super_admin). */
export function useUpdateAttendanceDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: AttendanceDaySetRequest }) =>
      api.patch(`v1/attendance/days/${id}`, { json: data }).json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

/** A5 — bitta biriktirish uchun sana oralig'ini belgilash (super_admin). */
export function useSetAttendanceRange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: UUID; data: AttendanceRangeSetRequest }) =>
      api
        .post(`v1/attendance/assignments/${assignmentId}/days/bulk-set`, { json: data })
        .json<AttendanceRangeSetResult>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

/** A6 — bir xil oraliqni ko'p biriktirishga belgilash (super_admin, 1..500). */
export function useBulkSetAttendanceRange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AttendanceRangeSetRequest & { assignment_ids: UUID[] }) =>
      api.post("v1/attendance/bulk-set-range", { json: data }).json<AttendanceBulkRangeSetResult>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

// Student-only (keyinroq ishlatish uchun)
export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: UUID; data: CheckInRequest }) =>
      api
        .post(`v1/attendance/assignments/${assignmentId}/check-in`, { json: data })
        .json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: UUID; data: CheckInRequest }) =>
      api
        .post(`v1/attendance/assignments/${assignmentId}/check-out`, { json: data })
        .json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

export function useTodayStatus(assignmentId: UUID | null) {
  return useQuery({
    queryKey: assignmentId ? attendanceKeys.today(assignmentId) : [],
    enabled: !!assignmentId,
    queryFn: () =>
      api.get(`v1/attendance/assignments/${assignmentId}/today`).json<AttendanceDayDetail | null>(),
  });
}

export function useBulkAttendanceUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { day_ids: string[]; status: AttendanceDayStatus; note?: string }) =>
      api
        .post("v1/attendance/bulk-update", { json: data })
        .json<{ updated_count: number; requested_count: number }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}
