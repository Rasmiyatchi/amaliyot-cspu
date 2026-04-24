import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  AttendanceApproveRequest,
  AttendanceDay,
  AttendanceDayDetail,
  AttendanceDayStatus,
  AttendanceMarkRedRequest,
  AttendanceOverride,
  AttendanceOverrideRequest,
  AttendanceRejectRequest,
  CheckInRequest,
  ISODate,
  Paginated,
  UUID,
} from "@/lib/api/types";

export type AttendanceFilters = {
  assignment_id?: UUID;
  student_id?: UUID;
  status?: AttendanceDayStatus;
  date_from?: ISODate;
  date_to?: ISODate;
};

export const attendanceKeys = {
  all: ["attendance"] as const,
  days: (f: AttendanceFilters, page: number, pageSize: number) =>
    [...attendanceKeys.all, "days", f, page, pageSize] as const,
  day: (id: UUID) => [...attendanceKeys.all, "day", id] as const,
  overrides: (dayId: UUID) => [...attendanceKeys.all, "overrides", dayId] as const,
  today: (assignmentId: UUID) => [...attendanceKeys.all, "today", assignmentId] as const,
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
  return p.toString();
}

export function useAttendanceDays(
  filters: AttendanceFilters = {},
  page = 1,
  pageSize = 50,
) {
  return useQuery({
    queryKey: attendanceKeys.days(filters, page, pageSize),
    queryFn: () =>
      api
        .get(`v1/attendance/days?${qs(filters, page, pageSize)}`)
        .json<Paginated<AttendanceDay>>(),
    placeholderData: (prev) => prev,
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
    queryFn: () =>
      api.get(`v1/attendance/days/${dayId}/overrides`).json<AttendanceOverride[]>(),
  });
}

export function useMarkRed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: UUID;
      data: AttendanceMarkRedRequest;
    }) =>
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
      api
        .post(`v1/attendance/days/${id}/approve`, { json: data })
        .json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

export function useRejectDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: AttendanceRejectRequest }) =>
      api
        .post(`v1/attendance/days/${id}/reject`, { json: data })
        .json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

export function useOverrideDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: AttendanceOverrideRequest }) =>
      api
        .post(`v1/attendance/days/${id}/override`, { json: data })
        .json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

// Student-only (keyinroq ishlatish uchun)
export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: UUID;
      data: CheckInRequest;
    }) =>
      api
        .post(`v1/attendance/assignments/${assignmentId}/check-in`, { json: data })
        .json<AttendanceDayDetail>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: UUID;
      data: CheckInRequest;
    }) =>
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
      api
        .get(`v1/attendance/assignments/${assignmentId}/today`)
        .json<AttendanceDayDetail | null>(),
  });
}
