import { HTTPError } from "ky";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleCheck,
  ClipboardList,
  Loader2,
  NotebookPen,
  Play,
  Plus,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AssignmentStatusBadge } from "@/components/admin/assignments/assignment-status-badge";
import { GradePanel } from "@/components/admin/assignments/grade-panel";
import { TaskGradeDialog } from "@/components/admin/assignments/task-grade-dialog";
import { TasksAddDialog } from "@/components/admin/assignments/tasks-add-dialog";
import { ArchiveCard } from "@/components/archive-card";
import {
  JournalStatusBadge,
  TaskStatusBadge,
} from "@/components/admin/tasks/task-status-badge";
import {
  TaskCategoryBadge,
  TaskTypeLabel,
} from "@/components/admin/tasks/task-type-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dateLocale } from "@/i18n";
import { useUpdateAssignment } from "@/lib/api/assignments";
import {
  useApproveJournal,
  useApproveLessonAnalysis,
  useAssignmentProgress,
  useAssignmentTasks,
  useDeleteTask,
  useEnsureTasks,
  useJournal,
  useLessonAnalyses,
  useRejectJournal,
  useRejectLessonAnalysis,
} from "@/lib/api/tasks";
import type { PracticeAssignment, Task } from "@/lib/api/types";

type Props = {
  assignment: PracticeAssignment | null;
  onClose: () => void;
};

export function AssignmentDetailDialog({ assignment, onClose }: Props) {
  const { t } = useTranslation();
  const assignmentId = assignment?.id ?? null;

  const { data: tasks } = useAssignmentTasks(assignmentId);
  const { data: progress } = useAssignmentProgress(assignmentId);
  const { data: journal } = useJournal(assignmentId);
  const { data: analyses } = useLessonAnalyses(assignmentId);

  const ensureTasks = useEnsureTasks();
  const deleteTask = useDeleteTask();
  const updateAssignment = useUpdateAssignment();
  const approveJournal = useApproveJournal();
  const rejectJournal = useRejectJournal();
  const approveAnalysis = useApproveLessonAnalysis();
  const rejectAnalysis = useRejectLessonAnalysis();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addTasksOpen, setAddTasksOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [journalRejectId, setJournalRejectId] = useState<string | null>(null);
  const [analysisRejectId, setAnalysisRejectId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    status: "active" | "completed" | "cancelled";
    reason?: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const tasksByGroup = useMemo(() => {
    if (!tasks) return new Map<string, Task[]>();
    const m = new Map<string, Task[]>();
    for (const item of tasks) {
      const key = `${item.template_semester}|${item.template_category}`;
      const arr = m.get(key) ?? [];
      arr.push(item);
      m.set(key, arr);
    }
    return m;
  }, [tasks]);

  if (!assignment) return null;

  const handleEnsure = async () => {
    try {
      const res = await ensureTasks.mutateAsync(assignment.id);
      toast.success(t("assignmentsAssignmentDetailDialog.tasksCreated", { n: res.created }));
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask.mutateAsync(taskToDelete.id);
      toast.success(t("common.deleted"));
      setTaskToDelete(null);
    } catch (err) {
      toast.error(err instanceof HTTPError ? err.message : t("common.error"));
    }
  };

  const handleJournalApprove = async (id: string) => {
    try {
      await approveJournal.mutateAsync(id);
      toast.success(t("assignmentsAssignmentDetailDialog.journalApproved"));
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleJournalRejectSubmit = async (reason: string) => {
    if (!journalRejectId) return;
    try {
      await rejectJournal.mutateAsync({
        id: journalRejectId,
        data: { rejection_reason: reason },
      });
      toast.success(t("assignmentsAssignmentDetailDialog.rejectedToast"));
      setJournalRejectId(null);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleAnalysisApprove = async (id: string) => {
    try {
      await approveAnalysis.mutateAsync(id);
      toast.success(t("assignmentsAssignmentDetailDialog.analysisApproved"));
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleStatusChange = async () => {
    if (!confirmAction || !assignment) return;
    try {
      await updateAssignment.mutateAsync({
        id: assignment.id,
        data: {
          status: confirmAction.status,
          ...(confirmAction.status === "cancelled"
            ? {
                cancelled_reason:
                  cancelReason.trim() ||
                  t("assignmentsAssignmentDetailDialog.cancelledDefault"),
              }
            : {}),
        },
      });
      const toastKeys = {
        active: "assignmentsAssignmentDetailDialog.toastStarted",
        completed: "assignmentsAssignmentDetailDialog.toastCompleted",
        cancelled: "assignmentsAssignmentDetailDialog.toastCancelled",
      };
      toast.success(t(toastKeys[confirmAction.status]));
      setConfirmAction(null);
      setCancelReason("");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleAnalysisRejectSubmit = async (reason: string) => {
    if (!analysisRejectId) return;
    try {
      await rejectAnalysis.mutateAsync({
        id: analysisRejectId,
        data: { rejection_reason: reason },
      });
      toast.success(t("assignmentsAssignmentDetailDialog.rejectedToast"));
      setAnalysisRejectId(null);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const pointsPercent =
    progress && progress.tasks_max_points > 0
      ? Math.min(100, Math.round((progress.tasks_earned_points / progress.tasks_max_points) * 100))
      : 0;

  return (
    <>
      <Dialog open={!!assignment} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div>{assignment.student_full_name}</div>
                <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                  {assignment.practice_type_name} ·{" "}
                  {assignment.organization_name ?? assignment.area_name ?? "—"}
                </div>
              </div>
              <AssignmentStatusBadge status={assignment.status} />
            </DialogTitle>
            <DialogDescription>
              ID: {assignment.student_hemis_id}
              {assignment.student_group_name && ` · ${assignment.student_group_name}`}
              {" · "}
              {new Date(assignment.start_date).toLocaleDateString(dateLocale())} —{" "}
              {new Date(assignment.end_date).toLocaleDateString(dateLocale())}
            </DialogDescription>
          </DialogHeader>

          {/* Lifecycle actions */}
          <div className="flex flex-wrap gap-2">
            {assignment.status === "draft" && (
              <Button
                size="sm"
                onClick={() => setConfirmAction({ status: "active" })}
                disabled={updateAssignment.isPending}
              >
                <Play className="h-3.5 w-3.5" />
                {t("assignmentsAssignmentDetailDialog.startPractice")}
              </Button>
            )}
            {assignment.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction({ status: "completed" })}
                disabled={updateAssignment.isPending}
              >
                <CircleCheck className="h-3.5 w-3.5" />
                {t("assignmentsAssignmentDetailDialog.finish")}
              </Button>
            )}
            {(assignment.status === "draft" || assignment.status === "active") && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmAction({ status: "cancelled" })}
                disabled={updateAssignment.isPending}
              >
                <XCircle className="h-3.5 w-3.5" />
                {t("assignmentsAssignmentDetailDialog.cancelAction")}
              </Button>
            )}
            {assignment.status === "cancelled" && assignment.cancelled_reason && (
              <div className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                {t("assignmentsAssignmentDetailDialog.reasonLabel", {
                  reason: assignment.cancelled_reason,
                })}
              </div>
            )}
          </div>

          {/* Progress summary */}
          {progress && (
            <div className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("assignmentsAssignmentDetailDialog.progressTitle")}
                </span>
                <span className="font-mono font-semibold">
                  {t("assignmentsAssignmentDetailDialog.pointsOf", {
                    earned: progress.tasks_earned_points,
                    max: progress.tasks_max_points,
                  })}
                </span>
              </div>
              <Progress value={pointsPercent} className="h-2" />
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <div className="text-muted-foreground">{t("common.total")}</div>
                  <div className="font-semibold">{progress.tasks_total}</div>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <div className="text-muted-foreground">
                    {t("assignmentsAssignmentDetailDialog.approvedLabel")}
                  </div>
                  <div className="font-semibold text-success">
                    {progress.tasks_by_status.approved}
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <div className="text-muted-foreground">
                    {t("assignmentsAssignmentDetailDialog.submittedLabel")}
                  </div>
                  <div className="font-semibold text-info">
                    {progress.tasks_by_status.submitted}
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <div className="text-muted-foreground">
                    {t("assignmentsAssignmentDetailDialog.rejectedLabel")}
                  </div>
                  <div className="font-semibold text-destructive">
                    {progress.tasks_by_status.rejected}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="tasks">
            <TabsList>
              <TabsTrigger value="tasks">
                <BookOpen className="h-3.5 w-3.5" />
                {t("assignmentsAssignmentDetailDialog.tabs.tasks")}
              </TabsTrigger>
              <TabsTrigger value="journal">
                <NotebookPen className="h-3.5 w-3.5" />
                {t("assignmentsAssignmentDetailDialog.tabs.journal")}{" "}
                {journal ? `(${journal.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="analyses">
                <Sparkles className="h-3.5 w-3.5" />
                {t("assignmentsAssignmentDetailDialog.tabs.analyses")}{" "}
                {analyses ? `(${analyses.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="grade">
                <Award className="h-3.5 w-3.5" />
                {t("assignmentsAssignmentDetailDialog.tabs.grade")}
              </TabsTrigger>
            </TabsList>

            {/* BAHOLASH */}
            <TabsContent value="grade">
              <GradePanel assignmentId={assignment.id} />
            </TabsContent>

            {/* TASKS */}
            <TabsContent value="tasks" className="space-y-3">
              {(!tasks || tasks.length === 0) && (
                <Alert>
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                    <span>{t("assignmentsAssignmentDetailDialog.noTasksYet")}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddTasksOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                        {t("assignmentsAssignmentDetailDialog.addSelected")}
                      </Button>
                      <Button size="sm" onClick={handleEnsure} disabled={ensureTasks.isPending}>
                        {ensureTasks.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {t("assignmentsAssignmentDetailDialog.addAll")}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {tasks && tasks.length > 0 && (
                <>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddTasksOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      {t("assignmentsAssignmentDetailDialog.addTask")}
                    </Button>
                  </div>
                  {Array.from(tasksByGroup.keys())
                    .sort()
                    .map((key) => {
                      const [sem, cat] = key.split("|");
                      const items = tasksByGroup.get(key)!;
                      return (
                        <div key={key} className="rounded-md border border-border">
                          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">
                              {sem === "fall"
                                ? t("common.semesterFall")
                                : t("common.semesterSpring")}
                            </span>
                            <TaskCategoryBadge category={cat as "spiritual" | "academic" | "report"} />
                          </div>
                          <div>
                            {items.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-start gap-3 border-b border-border last:border-0 hover:bg-muted/30"
                              >
                                <button
                                  onClick={() => setSelectedTask(task)}
                                  className="flex flex-1 items-start gap-3 p-3 text-left"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium leading-snug">{task.template_title}</div>
                                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                      <TaskTypeLabel type={task.template_type} />
                                      {task.template_quantity > 1 && (
                                        <Badge variant="outline">
                                          {t("assignmentsAssignmentDetailDialog.qtyN", {
                                            n: task.template_quantity,
                                          })}
                                        </Badge>
                                      )}
                                      {task.template_month_hint && <span>{task.template_month_hint}</span>}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1">
                                    <TaskStatusBadge status={task.status} />
                                    <span className="font-mono text-xs">
                                      {task.points_earned ?? "—"}/{task.template_points}
                                    </span>
                                  </div>
                                </button>
                                {task.status !== "approved" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mr-2 mt-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTaskToDelete(task);
                                    }}
                                    disabled={deleteTask.isPending}
                                    title={t("common.delete")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </>
              )}
            </TabsContent>

            {/* JOURNAL */}
            <TabsContent value="journal" className="space-y-2">
              {(!journal || journal.length === 0) && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {t("assignmentsAssignmentDetailDialog.noJournal")}
                </div>
              )}
              {journal?.map((j) => (
                <div key={j.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-xs text-muted-foreground">
                      {new Date(j.date).toLocaleDateString(dateLocale())}
                    </div>
                    <JournalStatusBadge status={j.status} />
                    {j.approved_by_name && (
                      <span className="text-xs text-muted-foreground">
                        · {j.approved_by_name}
                      </span>
                    )}
                    <div className="ml-auto flex gap-1">
                      {j.status === "submitted" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleJournalApprove(j.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setJournalRejectId(j.id)}
                          >
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm">{j.content_md}</div>
                  {j.rejection_reason && (
                    <div className="mt-2 rounded-md bg-destructive/5 px-2 py-1 text-xs text-destructive">
                      {t("assignmentsAssignmentDetailDialog.reasonLabel", {
                        reason: j.rejection_reason,
                      })}
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* LESSON ANALYSES */}
            <TabsContent value="analyses" className="space-y-2">
              {(!analyses || analyses.length === 0) && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {t("assignmentsAssignmentDetailDialog.noAnalyses")}
                </div>
              )}
              {analyses?.map((a) => (
                <div key={a.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{a.subject}</div>
                    <span className="text-xs text-muted-foreground">
                      · {a.teacher_name}
                    </span>
                    {a.grade_level && (
                      <Badge variant="outline" className="text-xs">
                        {a.grade_level}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {t("assignmentsAssignmentDetailDialog.quarterN", { n: a.quarter })}
                    </Badge>
                    <JournalStatusBadge status={a.status} />
                    <div className="ml-auto flex gap-1">
                      {a.status === "submitted" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAnalysisApprove(a.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAnalysisRejectId(a.id)}
                          >
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(a.date).toLocaleDateString(dateLocale())}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm">{a.analysis_md}</div>
                  {a.rejection_reason && (
                    <div className="mt-2 rounded-md bg-destructive/5 px-2 py-1 text-xs text-destructive">
                      {t("assignmentsAssignmentDetailDialog.reasonLabel", {
                        reason: a.rejection_reason,
                      })}
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <Separator />

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("assignmentsAssignmentDetailDialog.archiveTitle")}
            </div>
            <ArchiveCard assignmentId={assignment.id} compact />
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground">
            {assignment.supervisor_full_name && (
              <span>
                {t("assignmentsAssignmentDetailDialog.supervisorLabel", {
                  name: assignment.supervisor_full_name,
                })}
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TaskGradeDialog task={selectedTask} onClose={() => setSelectedTask(null)} />
      <TasksAddDialog
        open={addTasksOpen}
        assignmentId={assignmentId}
        onClose={() => setAddTasksOpen(false)}
      />

      <ConfirmDialog
        open={!!taskToDelete}
        title={t("assignmentsAssignmentDetailDialog.deleteTaskTitle")}
        description={
          taskToDelete ? (
            <Trans
              i18nKey="assignmentsAssignmentDetailDialog.deleteTaskDesc"
              values={{ title: taskToDelete.template_title }}
              components={[<strong key="0" />]}
            />
          ) : undefined
        }
        confirmText={t("common.delete")}
        variant="destructive"
        isPending={deleteTask.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setTaskToDelete(null)}
      />

      <PromptDialog
        open={!!journalRejectId}
        title={t("assignmentsAssignmentDetailDialog.rejectJournalTitle")}
        description={t("assignmentsAssignmentDetailDialog.rejectDesc")}
        label={t("assignmentsAssignmentDetailDialog.rejectReasonLabel")}
        placeholder={t("assignmentsAssignmentDetailDialog.rejectJournalPlaceholder")}
        confirmText={t("common.reject")}
        variant="destructive"
        isPending={rejectJournal.isPending}
        onConfirm={handleJournalRejectSubmit}
        onClose={() => setJournalRejectId(null)}
      />

      <PromptDialog
        open={!!analysisRejectId}
        title={t("assignmentsAssignmentDetailDialog.rejectAnalysisTitle")}
        description={t("assignmentsAssignmentDetailDialog.rejectDesc")}
        label={t("assignmentsAssignmentDetailDialog.rejectReasonLabel")}
        confirmText={t("common.reject")}
        variant="destructive"
        isPending={rejectAnalysis.isPending}
        onConfirm={handleAnalysisRejectSubmit}
        onClose={() => setAnalysisRejectId(null)}
      />

      {confirmAction && confirmAction.status !== "cancelled" && (
        <ConfirmDialog
          open={true}
          title={
            confirmAction.status === "active"
              ? t("assignmentsAssignmentDetailDialog.startConfirmTitle")
              : t("assignmentsAssignmentDetailDialog.finishConfirmTitle")
          }
          description={
            confirmAction.status === "active"
              ? t("assignmentsAssignmentDetailDialog.startConfirmDesc")
              : t("assignmentsAssignmentDetailDialog.finishConfirmDesc")
          }
          confirmText={
            confirmAction.status === "active"
              ? t("assignmentsAssignmentDetailDialog.start")
              : t("assignmentsAssignmentDetailDialog.finish")
          }
          isPending={updateAssignment.isPending}
          onConfirm={handleStatusChange}
          onClose={() => setConfirmAction(null)}
        />
      )}

      <PromptDialog
        open={confirmAction?.status === "cancelled"}
        title={t("assignmentsAssignmentDetailDialog.cancelPromptTitle")}
        description={t("assignmentsAssignmentDetailDialog.cancelPromptDesc")}
        label={t("assignmentsAssignmentDetailDialog.reasonShort")}
        placeholder={t("assignmentsAssignmentDetailDialog.cancelPromptPlaceholder")}
        confirmText={t("assignmentsAssignmentDetailDialog.cancelAction")}
        variant="destructive"
        isPending={updateAssignment.isPending}
        onConfirm={(reason) => {
          setCancelReason(reason);
          handleStatusChange();
        }}
        onClose={() => {
          setConfirmAction(null);
          setCancelReason("");
        }}
      />
    </>
  );
}
