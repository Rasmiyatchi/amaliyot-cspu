import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { assignmentKeys } from "@/lib/api/assignments";
import type { UUID } from "@/lib/api/types";

export type CriterionScore = {
  key: string;
  name: string;
  max: number;
  grader: string | null;
  /** Avtomatik hisoblanadi (davomat / topshiriq ballari) — qo'lda kiritilmaydi */
  auto: boolean;
  /** Qo'lda baholanadigan, hali qo'yilmagan mezonlarda null */
  score: number | null;
  /** Avtomatik mezonlar uchun tushuntirish, masalan "72% davomat" */
  detail: string | null;
};

export type GradeBreakdown = {
  assignment_id: UUID;
  practice_type_name: string;
  criteria: CriterionScore[];
  total: number;
  max_total: number;
  min_total: number;
  passed: boolean | null;
  missing_criteria: string[];
  complete: boolean;
  attendance_percent: number | null;
  final_grade: number | null;
  credit_earned: boolean;
  status: string;
};

export const gradingKeys = {
  all: ["grading"] as const,
  breakdown: (id: UUID) => [...gradingKeys.all, "breakdown", id] as const,
};

export function useGradeBreakdown(assignmentId: UUID | null) {
  return useQuery({
    queryKey: gradingKeys.breakdown(assignmentId ?? ("" as UUID)),
    queryFn: () =>
      api.get(`v1/grading/assignments/${assignmentId}`).json<GradeBreakdown>(),
    enabled: !!assignmentId,
  });
}

export function useSetCriterionScore(assignmentId: UUID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { key: string; score: number }) =>
      api
        .post(`v1/grading/assignments/${assignmentId}/criteria`, { json: payload })
        .json<GradeBreakdown>(),
    onSuccess: (data) => {
      qc.setQueryData(gradingKeys.breakdown(assignmentId), data);
    },
  });
}

export function useFinalizeGrade(assignmentId: UUID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post(`v1/grading/assignments/${assignmentId}/finalize`).json<GradeBreakdown>(),
    onSuccess: (data) => {
      qc.setQueryData(gradingKeys.breakdown(assignmentId), data);
      // Yakunlash status va final_grade'ni o'zgartiradi — ro'yxatlar eskiradi
      void qc.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}
