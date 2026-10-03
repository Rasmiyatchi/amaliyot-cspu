import { useQuery } from "@tanstack/react-query";

import i18n from "@/i18n";
import { api, downloadFile } from "@/lib/api";
import type {
  AssignmentStatus,
  AttendanceDayStatus,
  ContractStatus,
  StudentStatus,
  TaskStatus,
  UUID,
} from "@/lib/api/types";

const REFETCH_MS = 30_000; // polling 30s

export type PendingReviews = {
  tasks: number;
  journals: number;
  analyses: number;
  total: number;
};

export type CapacityAlert = {
  kind: "organization" | "supervisor";
  id: UUID;
  name: string;
  used: number;
  capacity: number;
  percent: number;
  severity: "near_full" | "full";
};

export type PracticeTypeStat = {
  id: UUID;
  code: string;
  name: string;
  min_weeks: number;
  max_weeks: number;
  requires_contract: boolean;
  active: number;
  completed: number;
  draft: number;
  cancelled?: number;
  total: number;
};

export type AdminStats = {
  students: {
    total: number;
    by_status: Record<StudentStatus, number>;
    assigned?: number;
    unassigned?: number;
  };
  assignments: { total: number; by_status: Record<AssignmentStatus, number> };
  practice_types?: PracticeTypeStat[];
  contracts: { total: number; by_status: Record<ContractStatus, number> };
  organizations: number;
  supervisors: number;
  attendance_30d: {
    total: number;
    green: number;
    red: number;
    pending: number;
    green_percent: number | null;
  };
  tasks: { total: number; by_status: Record<TaskStatus, number> };
  pending_reviews: PendingReviews;
  capacity_alerts: CapacityAlert[];
};

export type SuperAdminStats = AdminStats & {
  users_total: number;
  recent_overrides: {
    id: UUID;
    previous_status: AttendanceDayStatus;
    new_status: AttendanceDayStatus;
    reason: string;
    created_at: string;
    admin_name: string;
  }[];
};

export type SupervisorStats = {
  assignments_total: number;
  today: Record<AttendanceDayStatus, number>;
  pending_attendance: number;
  pending_reviews: PendingReviews;
  points_earned: number;
  points_max: number;
};

export type StudentStats = {
  has_assignment: boolean;
  assignment_id?: UUID;
  days_left?: number;
  attendance?: {
    total: number;
    green: number;
    red: number;
    pending: number;
    percent: number | null;
  };
  tasks?: {
    earned_points: number;
    max_points: number;
    rejected: number;
  };
  journals_rejected?: number;
};

type StatsQueryOptions = {
  /** false — so'rov yuborilmaydi (masalan, rolga mos bo'lmagan endpoint 403 qaytarmasin) */
  enabled?: boolean;
};

/** Admin va Super Admin uchun KPI'lar. Super Admin uchun `useSuperAdminStats` (bu + qo'shimchalar). */
export function useAdminStats({ enabled = true }: StatsQueryOptions = {}) {
  return useQuery({
    queryKey: ["stats", "admin"] as const,
    queryFn: () => api.get("v1/stats/admin").json<AdminStats>(),
    refetchInterval: REFETCH_MS,
    enabled,
  });
}

/** Faqat Super Admin — boshqa rollarga server 403 qaytaradi, shuning uchun `enabled` bilan chaqiring. */
export function useSuperAdminStats({ enabled = true }: StatsQueryOptions = {}) {
  return useQuery({
    queryKey: ["stats", "super-admin"] as const,
    queryFn: () => api.get("v1/stats/super-admin").json<SuperAdminStats>(),
    refetchInterval: REFETCH_MS,
    enabled,
  });
}

/**
 * Rolga mos KPI'lar: Super Admin — `/stats/super-admin` (admin KPI'larini ham o'z ichiga oladi),
 * Admin — `/stats/admin`. Faqat bitta so'rov yuboriladi (avval ikkalasi so'ralib, admin
 * uchun har 30 soniyada 403 qaytardi).
 */
export function useRoleStats(isSuperAdmin: boolean) {
  const admin = useAdminStats({ enabled: !isSuperAdmin });
  const superAdmin = useSuperAdminStats({ enabled: isSuperAdmin });
  const active = isSuperAdmin ? superAdmin : admin;
  const stats: AdminStats | undefined = active.data;
  return {
    stats,
    superAdminStats: isSuperAdmin ? superAdmin.data : undefined,
    isPending: active.isPending,
    isFetching: active.isFetching,
    error: active.error,
    refetch: active.refetch,
  };
}

export function useSupervisorStats(filters?: { academic_year_id?: string; semester?: string }) {
  const p = new URLSearchParams();
  if (filters?.academic_year_id) p.set("academic_year_id", filters.academic_year_id);
  if (filters?.semester) p.set("semester", filters.semester);
  const qs = p.toString();

  return useQuery({
    queryKey: ["stats", "supervisor", filters] as const,
    queryFn: () =>
      api.get(`v1/stats/supervisor${qs ? `?${qs}` : ""}`).json<SupervisorStats>(),
    refetchInterval: REFETCH_MS,
  });
}

export function useStudentStats() {
  return useQuery({
    queryKey: ["stats", "student"] as const,
    queryFn: () => api.get("v1/stats/student").json<StudentStats | null>(),
    refetchInterval: REFETCH_MS,
  });
}

/** Dashboard statistika hisobotini PDF sifatida yuklab oladi. */
export function downloadStatsPdfReport(): Promise<void> {
  return downloadFile(
    "/api/v1/stats/report.pdf",
    "amaliyot_statistikasi.pdf",
    i18n.t("adminIndex.pdfDownloadError"),
  );
}
