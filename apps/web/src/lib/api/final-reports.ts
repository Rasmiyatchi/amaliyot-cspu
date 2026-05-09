import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Attachment } from "@/lib/api/uploads";
import type { UUID } from "@/lib/api/types";

export type FinalReportStatus = "draft" | "submitted" | "approved" | "rejected";

export type FinalReport = {
  id: UUID;
  assignment_id: UUID;
  student_full_name: string | null;
  practice_type_name: string | null;
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

export const finalReportKeys = {
  all: ["final-reports"] as const,
  list: (status?: FinalReportStatus) => [...finalReportKeys.all, "list", status] as const,
  byAssignment: (assignmentId: UUID) =>
    [...finalReportKeys.all, "by-assignment", assignmentId] as const,
};

export function useFinalReports(status?: FinalReportStatus) {
  return useQuery({
    queryKey: finalReportKeys.list(status),
    queryFn: () => {
      const p = new URLSearchParams();
      if (status) p.set("status_filter", status);
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
