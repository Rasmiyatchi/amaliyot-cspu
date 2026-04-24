import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
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

export type AdminStats = {
  students: { total: number; by_status: Record<StudentStatus, number> };
  assignments: { total: number; by_status: Record<AssignmentStatus, number> };
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
