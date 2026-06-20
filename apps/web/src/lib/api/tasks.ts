import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  AssignmentProgress,
  JournalCreateRequest,
  JournalEntry,
  JournalRejectRequest,
  JournalUpdateRequest,
  LessonAnalysis,
  LessonAnalysisCreateRequest,
  LessonAnalysisUpdateRequest,
  Semester,
  Task,
  TaskGradeRequest,
  TaskRejectRequest,
  TaskSubmitRequest,
  TaskTemplate,
  UUID,
} from "@/lib/api/types";

export type OverdueTask = {
  task_id: UUID;
  assignment_id: UUID;
  template_title: string;
  template_points: number;
  due_date: string;
  days_overdue: number;
  status: "not_started" | "rejected";
  student_full_name: string | null;
  student_hemis_id: string | null;
  group_name: string | null;
};

export const taskKeys = {
  all: ["tasks"] as const,
  templates: (practice_type_id?: UUID, course?: number, semester?: Semester) =>
    [...taskKeys.all, "templates", practice_type_id, course, semester] as const,
  assignmentTasks: (assignmentId: UUID) =>
    [...taskKeys.all, "assignment", assignmentId] as const,
  progress: (assignmentId: UUID) =>
    [...taskKeys.all, "progress", assignmentId] as const,
  journal: (assignmentId: UUID) =>
    [...taskKeys.all, "journal", assignmentId] as const,
  analyses: (assignmentId: UUID, quarter?: number) =>
    [...taskKeys.all, "analyses", assignmentId, quarter] as const,
  overdue: () => [...taskKeys.all, "overdue"] as const,
};

export function useOverdueTasks(enabled = true) {
  return useQuery({
    queryKey: taskKeys.overdue(),
    enabled,
    queryFn: () => api.get("v1/tasks/overdue").json<OverdueTask[]>(),
  });
}

// ─── Templates ───────────────────────────────────────────

export function useTaskTemplates(filters: {
  practice_type_id?: UUID;
  course?: number;
  semester?: Semester;
} = {}) {
  return useQuery({
    queryKey: taskKeys.templates(
      filters.practice_type_id,
      filters.course,
      filters.semester,
    ),
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters.practice_type_id) p.set("practice_type_id", filters.practice_type_id);
      if (filters.course) p.set("course", String(filters.course));
      if (filters.semester) p.set("semester", filters.semester);
      return api.get(`v1/task-templates?${p.toString()}`).json<TaskTemplate[]>();
    },
  });
}

// ─── Tasks ──────────────────────────────────────────────

export function useAssignmentTasks(assignmentId: UUID | null) {
  return useQuery({
    queryKey: assignmentId ? taskKeys.assignmentTasks(assignmentId) : [],
    enabled: !!assignmentId,
    queryFn: () =>
      api.get(`v1/assignments/${assignmentId}/tasks`).json<Task[]>(),
  });
}

export function useAssignmentProgress(assignmentId: UUID | null) {
  return useQuery({
    queryKey: assignmentId ? taskKeys.progress(assignmentId) : [],
    enabled: !!assignmentId,
    queryFn: () =>
      api.get(`v1/assignments/${assignmentId}/progress`).json<AssignmentProgress>(),
  });
}

export function useEnsureTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: UUID) =>
      api
        .post(`v1/assignments/${assignmentId}/tasks/ensure`)
        .json<{ assignment_id: UUID; created: number }>(),
    onSuccess: (_, assignmentId) => {
      qc.invalidateQueries({ queryKey: taskKeys.assignmentTasks(assignmentId) });
      qc.invalidateQueries({ queryKey: taskKeys.progress(assignmentId) });
    },
  });
}

export function useAvailableTemplates(assignmentId: UUID | null) {
  return useQuery({
    queryKey: assignmentId
      ? ([...taskKeys.all, "available", assignmentId] as const)
      : [],
    enabled: !!assignmentId,
    queryFn: () =>
      api
        .get(`v1/assignments/${assignmentId}/available-templates`)
        .json<TaskTemplate[]>(),
  });
}

export type TaskAssignItem = {
  template_id: UUID;
  due_date: string; // YYYY-MM-DD
  notes?: string | null;
};

export function useAddTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      items,
    }: {
      assignmentId: UUID;
      items: TaskAssignItem[];
    }) =>
      api
        .post(`v1/assignments/${assignmentId}/tasks`, {
          json: { items },
        })
        .json<{ assignment_id: UUID; created: number; task_ids: UUID[] }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useSubmitTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: TaskSubmitRequest }) =>
      api.post(`v1/tasks/${id}/submit`, { json: data }).json<Task>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useApproveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: TaskGradeRequest }) =>
      api.post(`v1/tasks/${id}/approve`, { json: data }).json<Task>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useRejectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: TaskRejectRequest }) =>
      api.post(`v1/tasks/${id}/reject`, { json: data }).json<Task>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// ─── Journal ────────────────────────────────────────────

export function useJournal(assignmentId: UUID | null) {
  return useQuery({
    queryKey: assignmentId ? taskKeys.journal(assignmentId) : [],
    enabled: !!assignmentId,
    queryFn: () =>
      api.get(`v1/assignments/${assignmentId}/journal`).json<JournalEntry[]>(),
  });
}

export function useCreateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: UUID;
      data: JournalCreateRequest;
    }) =>
      api
        .post(`v1/assignments/${assignmentId}/journal`, { json: data })
        .json<JournalEntry>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: JournalUpdateRequest }) =>
      api.patch(`v1/journal/${id}`, { json: data }).json<JournalEntry>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useApproveJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      api.post(`v1/journal/${id}/approve`).json<JournalEntry>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useRejectJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: JournalRejectRequest }) =>
      api.post(`v1/journal/${id}/reject`, { json: data }).json<JournalEntry>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// ─── LessonAnalysis ─────────────────────────────────────

export function useLessonAnalyses(assignmentId: UUID | null, quarter?: number) {
  return useQuery({
    queryKey: assignmentId ? taskKeys.analyses(assignmentId, quarter) : [],
    enabled: !!assignmentId,
    queryFn: () => {
      const p = new URLSearchParams();
      if (quarter) p.set("quarter", String(quarter));
      return api
        .get(`v1/assignments/${assignmentId}/lesson-analyses?${p.toString()}`)
        .json<LessonAnalysis[]>();
    },
  });
}

export function useCreateLessonAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: UUID;
      data: LessonAnalysisCreateRequest;
    }) =>
      api
        .post(`v1/assignments/${assignmentId}/lesson-analyses`, { json: data })
        .json<LessonAnalysis>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateLessonAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: LessonAnalysisUpdateRequest }) =>
      api.patch(`v1/lesson-analyses/${id}`, { json: data }).json<LessonAnalysis>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useApproveLessonAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      api.post(`v1/lesson-analyses/${id}/approve`).json<LessonAnalysis>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useRejectLessonAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: JournalRejectRequest }) =>
      api
        .post(`v1/lesson-analyses/${id}/reject`, { json: data })
        .json<LessonAnalysis>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export type TaskTemplateCreatePayload = {
  practice_type_id: UUID;
  course: number;
  semester: "fall" | "spring";
  category: "spiritual" | "academic" | "report";
  type: string;
  title: string;
  description?: string | null;
  points: number;
  quantity?: number;
  month_hint?: string | null;
  display_order?: number;
  is_active?: boolean;
};

export type TaskTemplateUpdatePayload = Partial<Omit<TaskTemplateCreatePayload, "practice_type_id">>;

export function useCreateTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TaskTemplateCreatePayload) =>
      api.post("v1/task-templates", { json: data }).json<TaskTemplate>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: TaskTemplateUpdatePayload }) =>
      api.patch(`v1/task-templates/${id}`, { json: data }).json<TaskTemplate>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useDeleteTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/task-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
