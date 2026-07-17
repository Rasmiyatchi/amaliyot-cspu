import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Attachment } from "@/lib/api/uploads";
import type { UUID } from "@/lib/api/types";

export type FinalReportStatus = "draft" | "submitted" | "approved" | "rejected";

export type FinalReport = {
  id: UUID;
  assignment_id: UUID;
  student_full_name: string | null;
  group_name: string | null;
  practice_type_name: string | null;
  final_grade: number | null;
  credit_earned: boolean | null;
  title: string;
  file_attachment: Attachment;
  status: FinalReportStatus;
  reviewer_id: UUID | null;
  reviewer_name: string | null;
  reviewer_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FinalReportSubmitPayload = {
  title: string;
  file_attachment: Attachment;
};

export type FinalReportReviewPayload = {
  approve: boolean;
  note?: string | null;
};

export type FinalReportFilters = {
  academic_year_id?: UUID;
  group_id?: UUID;
  direction_id?: UUID;
  faculty_id?: UUID;
  course?: number;
  search?: string;
};

export const finalReportKeys = {
  all: ["final-reports"] as const,
  list: (status?: FinalReportStatus, filters?: FinalReportFilters) =>
    [...finalReportKeys.all, "list", status, filters ?? {}] as const,
  byAssignment: (assignmentId: UUID) =>
    [...finalReportKeys.all, "by-assignment", assignmentId] as const,
};

export function useFinalReports(status?: FinalReportStatus, filters: FinalReportFilters = {}) {
  return useQuery({
    queryKey: finalReportKeys.list(status, filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (status) p.set("status_filter", status);
      if (filters.academic_year_id) p.set("academic_year_id", filters.academic_year_id);
      if (filters.group_id) p.set("group_id", filters.group_id);
      if (filters.direction_id) p.set("direction_id", filters.direction_id);
      if (filters.faculty_id) p.set("faculty_id", filters.faculty_id);
      if (filters.course !== undefined) p.set("course", String(filters.course));
      if (filters.search) p.set("search", filters.search);
      return api.get(`v1/final-reports?${p}`).json<FinalReport[]>();
    },
  });
}

export function useFinalReportForAssignment(assignmentId: UUID | null) {
  return useQuery({
    queryKey: assignmentId ? finalReportKeys.byAssignment(assignmentId) : [],
    enabled: !!assignmentId,
    queryFn: () =>
      api
        .get(`v1/final-reports/by-assignment/${assignmentId}`)
        .json<FinalReport | null>(),
  });
}

export function useSubmitFinalReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: UUID;
      data: FinalReportSubmitPayload;
    }) =>
      api
        .post(`v1/final-reports/by-assignment/${assignmentId}`, { json: data })
        .json<FinalReport>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: finalReportKeys.all }),
  });
}

export function useReviewFinalReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: FinalReportReviewPayload }) =>
      api.post(`v1/final-reports/${id}/review`, { json: data }).json<FinalReport>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: finalReportKeys.all }),
  });
}
