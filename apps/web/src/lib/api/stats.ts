import { useQuery } from "@tanstack/react-query";

import i18n from "@/i18n";
import { api } from "@/lib/api";
import type {
  AssignmentStatus,
  AttendanceDayStatus,
  ContractStatus,
  StudentStatus,
  TaskStatus,
  UUID,
} from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

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
  students: { total: number; by_status: Record<StudentStatus, number> };
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

export function useAdminStats() {
  return useQuery({
    queryKey: ["stats", "admin"] as const,
    queryFn: () => api.get("v1/stats/admin").json<AdminStats>(),
    refetchInterval: REFETCH_MS,
  });
}

export function useSuperAdminStats() {
  return useQuery({
    queryKey: ["stats", "super-admin"] as const,
    queryFn: () => api.get("v1/stats/super-admin").json<SuperAdminStats>(),
    refetchInterval: REFETCH_MS,
  });
}

export function useSupervisorStats() {
  return useQuery({
    queryKey: ["stats", "supervisor"] as const,
    queryFn: () => api.get("v1/stats/supervisor").json<SupervisorStats>(),
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
export async function downloadStatsPdfReport(): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error(i18n.t("common.sessionExpired"));

  const res = await fetch("/api/v1/stats/report.pdf", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Hisobot yuklab bo'lmadi (${res.status})`);
  }

  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? "amaliyot_statistikasi.pdf";

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
