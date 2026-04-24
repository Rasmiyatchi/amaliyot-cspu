import { HTTPError } from "ky";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  NotebookPen,
  Plus,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AssignmentStatusBadge } from "@/components/admin/assignments/assignment-status-badge";
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
  const assignmentId = assignment?.id ?? null;

  const { data: tasks } = useAssignmentTasks(assignmentId);
  const { data: progress } = useAssignmentProgress(assignmentId);
  const { data: journal } = useJournal(assignmentId);
  const { data: analyses } = useLessonAnalyses(assignmentId);

  const ensureTasks = useEnsureTasks();
  const deleteTask = useDeleteTask();
  const approveJournal = useApproveJournal();
  const rejectJournal = useRejectJournal();
  const approveAnalysis = useApproveLessonAnalysis();
  const rejectAnalysis = useRejectLessonAnalysis();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addTasksOpen, setAddTasksOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [journalRejectId, setJournalRejectId] = useState<string | null>(null);
  const [analysisRejectId, setAnalysisRejectId] = useState<string | null>(null);

  const tasksByGroup = useMemo(() => {
    if (!tasks) return new Map<string, Task[]>();
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = `${t.template_semester}|${t.template_category}`;
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return m;
  }, [tasks]);

  if (!assignment) return null;

  const handleEnsure = async () => {
    try {
      const res = await ensureTasks.mutateAsync(assignment.id);
      toast.success(`${res.created} ta topshiriq yaratildi`);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask.mutateAsync(taskToDelete.id);
      toast.success("O'chirildi");
      setTaskToDelete(null);
    } catch (err) {
      toast.error(err instanceof HTTPError ? err.message : "Xatolik");
    }
  };

  const handleJournalApprove = async (id: string) => {
    try {
      await approveJournal.mutateAsync(id);
      toast.success("Kundalik tasdiqlandi");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleJournalRejectSubmit = async (reason: string) => {
    if (!journalRejectId) return;
    try {
      await rejectJournal.mutateAsync({
        id: journalRejectId,
        data: { rejection_reason: reason },
      });
      toast.success("Rad etildi");
      setJournalRejectId(null);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleAnalysisApprove = async (id: string) => {
    try {
      await approveAnalysis.mutateAsync(id);
      toast.success("Tahlil tasdiqlandi");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleAnalysisRejectSubmit = async (reason: string) => {
    if (!analysisRejectId) return;
    try {
      await rejectAnalysis.mutateAsync({
        id: analysisRejectId,
        data: { rejection_reason: reason },
      });
      toast.success("Rad etildi");
      setAnalysisRejectId(null);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
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
              HEMIS: {assignment.student_hemis_id}
              {assignment.student_group_name && ` · ${assignment.student_group_name}`}
              {" · "}
              {new Date(assignment.start_date).toLocaleDateString("uz-UZ")} —{" "}
              {new Date(assignment.end_date).toLocaleDateString("uz-UZ")}
            </DialogDescription>
          </DialogHeader>

          {/* Progress summary */}
          {progress && (
            <div className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">O'quv ishlari progress</span>
                <span className="font-mono font-semibold">
                  {progress.tasks_earned_points} / {progress.tasks_max_points} ball
                </span>
              </div>
              <Progress value={pointsPercent} className="h-2" />
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <div className="text-muted-foreground">Jami</div>
                  <div className="font-semibold">{progress.tasks_total}</div>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <div className="text-muted-foreground">Tasdiqlangan</div>
                  <div className="font-semibold text-success">
                    {progress.tasks_by_status.approved}
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <div className="text-muted-foreground">Yuborilgan</div>
                  <div className="font-semibold text-info">
                    {progress.tasks_by_status.submitted}
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <div className="text-muted-foreground">Rad etilgan</div>
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
                Topshiriqlar
              </TabsTrigger>
              <TabsTrigger value="journal">
                <NotebookPen className="h-3.5 w-3.5" />
                Kundalik {journal ? `(${journal.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="analyses">
                <Sparkles className="h-3.5 w-3.5" />
                Dars tahlillari {analyses ? `(${analyses.length})` : ""}
              </TabsTrigger>
            </TabsList>

            {/* TASKS */}
            <TabsContent value="tasks" className="space-y-3">
              {(!tasks || tasks.length === 0) && (
                <Alert>
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                    <span>Topshiriqlar hali qo'shilmagan</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddTasksOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Tanlab qo'shish
                      </Button>
                      <Button size="sm" onClick={handleEnsure} disabled={ensureTasks.isPending}>
                        {ensureTasks.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Barchasini qo'shish
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
                      Topshiriq qo'shish
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
                              {sem === "fall" ? "Kuzgi" : "Bahorgi"}
                            </span>
                            <TaskCategoryBadge category={cat as "spiritual" | "academic" | "report"} />
                          </div>
                          <div>
                            {items.map((t) => (
                              <div
                                key={t.id}
                                className="flex items-start gap-3 border-b border-border last:border-0 hover:bg-muted/30"
                              >
                                <button
                                  onClick={() => setSelectedTask(t)}
                                  className="flex flex-1 items-start gap-3 p-3 text-left"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium leading-snug">{t.template_title}</div>
                                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                      <TaskTypeLabel type={t.template_type} />
                                      {t.template_quantity > 1 && (
                                        <Badge variant="outline">{t.template_quantity} ta</Badge>
                                      )}
                                      {t.template_month_hint && <span>{t.template_month_hint}</span>}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1">
                                    <TaskStatusBadge status={t.status} />
                                    <span className="font-mono text-xs">
                                      {t.points_earned ?? "—"}/{t.template_points}
                                    </span>
                                  </div>
                                </button>
                                {t.status !== "approved" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mr-2 mt-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTaskToDelete(t);
                                    }}
                                    disabled={deleteTask.isPending}
                                    title="O'chirish"
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
                  Kundalik yozuvlari yo'q
                </div>
              )}
              {journal?.map((j) => (
                <div key={j.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-xs text-muted-foreground">
                      {new Date(j.date).toLocaleDateString("uz-UZ")}
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
                      Sabab: {j.rejection_reason}
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* LESSON ANALYSES */}
            <TabsContent value="analyses" className="space-y-2">
              {(!analyses || analyses.length === 0) && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Dars tahlili yo'q
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
                      {a.quarter}-chorak
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
                    {new Date(a.date).toLocaleDateString("uz-UZ")}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm">{a.analysis_md}</div>
                  {a.rejection_reason && (
                    <div className="mt-2 rounded-md bg-destructive/5 px-2 py-1 text-xs text-destructive">
                      Sabab: {a.rejection_reason}
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <Separator />

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Yig'ma jild
            </div>
            <ArchiveCard assignmentId={assignment.id} compact />
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground">
            {assignment.supervisor_full_name && (
              <span>Rahbar: {assignment.supervisor_full_name}</span>
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
        title="Topshiriqni o'chirish"
        description={
          taskToDelete ? (
            <>
              <strong>{taskToDelete.template_title}</strong> — bu amal bekor qilib
              bo'lmaydi.
            </>
          ) : undefined
        }
        confirmText="O'chirish"
        variant="destructive"
        isPending={deleteTask.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setTaskToDelete(null)}
      />

      <PromptDialog
        open={!!journalRejectId}
        title="Kundalikni rad etish"
        description="Talabaga sababni ko'rsating"
        label="Rad etish sababi"
        placeholder="Masalan: matn juda qisqa, yanada batafsil yozing..."
        confirmText="Rad etish"
        variant="destructive"
        isPending={rejectJournal.isPending}
        onConfirm={handleJournalRejectSubmit}
        onClose={() => setJournalRejectId(null)}
      />

      <PromptDialog
        open={!!analysisRejectId}
        title="Dars tahlilini rad etish"
        description="Talabaga sababni ko'rsating"
        label="Rad etish sababi"
        confirmText="Rad etish"
        variant="destructive"
        isPending={rejectAnalysis.isPending}
        onConfirm={handleAnalysisRejectSubmit}
        onClose={() => setAnalysisRejectId(null)}
      />
    </>
  );
}
