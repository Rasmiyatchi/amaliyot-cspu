import { BookOpen, NotebookPen, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { JournalStatusBadge, TaskStatusBadge } from "@/components/admin/tasks/task-status-badge";
import { TaskCategoryBadge, TaskTypeLabel } from "@/components/admin/tasks/task-type-badge";
import { formatTashkentDate, todayStr } from "@/components/attendance/attendance-date-utils";
import { LessonAnalysisFormDialog } from "@/components/student/analysis-form-dialog";
import { JournalFormDialog } from "@/components/student/journal-form-dialog";
import { StudentTaskSubmitDialog } from "@/components/student/task-submit-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dateLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  useAssignmentProgress,
  useAssignmentTasks,
  useJournal,
  useLessonAnalyses,
} from "@/lib/api/tasks";
import type {
  JournalEntry,
  LessonAnalysis,
  Semester,
  Task,
  TaskCategory,
  UUID,
} from "@/lib/api/types";

type Props = {
  assignmentId: UUID;
};

type TaskGroup = { key: string; semester: Semester; category: TaskCategory; items: Task[] };

/**
 * Muddati o'tgan — server qoidasi bilan bir xil (faqat boshlanmagan yoki rad etilgan topshiriq),
 * lekin sana Toshkent bo'yicha: deadline kuni oxirigacha muddati o'tgan hisoblanmaydi.
 */
function isOverdue(task: Task, today: string): boolean {
  return (
    !!task.due_date &&
    (task.status === "not_started" || task.status === "rejected") &&
    task.due_date.slice(0, 10) < today
  );
}

export function StudentAcademicPanel({ assignmentId }: Props) {
  const { t } = useTranslation();
  const locale = dateLocale();
  const today = todayStr();
  const { data: tasks } = useAssignmentTasks(assignmentId);
  const { data: progress } = useAssignmentProgress(assignmentId);
  const { data: journal } = useJournal(assignmentId);
  const { data: analyses } = useLessonAnalyses(assignmentId);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks?.find((t) => t.id === selectedTaskId) ?? null;
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalEdit, setJournalEdit] = useState<JournalEntry | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisEdit, setAnalysisEdit] = useState<LessonAnalysis | null>(null);

  const pointsPercent =
    progress && progress.tasks_max_points > 0
      ? Math.min(100, Math.round((progress.tasks_earned_points / progress.tasks_max_points) * 100))
      : 0;

  const taskGroups = useMemo(() => {
    const m = new Map<string, TaskGroup>();
    for (const task of tasks ?? []) {
      const key = `${task.template_semester}|${task.template_category}`;
      const group = m.get(key) ?? {
        key,
        semester: task.template_semester,
        category: task.template_category,
        items: [],
      };
      group.items.push(task);
      m.set(key, group);
    }
    return Array.from(m.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [tasks]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("studentAcademicPanel.progressTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {progress && (
            <>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("studentAcademicPanel.totalPoints")}
                </span>
                <span className="font-mono font-semibold">
                  {progress.tasks_earned_points} / {progress.tasks_max_points}
                </span>
              </div>
              <Progress value={pointsPercent} className="h-2" />
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-muted/40 px-2 py-1.5 text-center">
                  <div className="text-muted-foreground">{t("studentAcademicPanel.approved")}</div>
                  <div className="font-semibold text-success">
                    {progress.tasks_by_status.approved}
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5 text-center">
                  <div className="text-muted-foreground">{t("studentAcademicPanel.submitted")}</div>
                  <div className="font-semibold text-info">
                    {progress.tasks_by_status.submitted}
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5 text-center">
                  <div className="text-muted-foreground">{t("studentAcademicPanel.rejected")}</div>
                  <div className="font-semibold text-destructive">
                    {progress.tasks_by_status.rejected}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="tasks">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/60">
              <TabsTrigger
                value="tasks"
                className="px-1 sm:px-3 py-1.5 text-[11px] sm:text-sm font-medium flex items-center justify-center gap-1 min-w-0"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 hidden sm:inline" />
                <span className="truncate">
                  <span className="hidden sm:inline">{t("studentAcademicPanel.tasksTab")}</span>
                  <span className="sm:hidden">{t("studentAcademicPanel.tasksTabShort")}</span>
                  {tasks ? ` (${tasks.length})` : ""}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="journal"
                className="px-1 sm:px-3 py-1.5 text-[11px] sm:text-sm font-medium flex items-center justify-center gap-1 min-w-0"
              >
                <NotebookPen className="h-3.5 w-3.5 shrink-0 hidden sm:inline" />
                <span className="truncate">
                  {t("studentAcademicPanel.journalTab")} {journal ? `(${journal.length})` : ""}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="analyses"
                className="px-1 sm:px-3 py-1.5 text-[11px] sm:text-sm font-medium flex items-center justify-center gap-1 min-w-0"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 hidden sm:inline" />
                <span className="truncate">
                  <span className="hidden sm:inline">{t("studentAcademicPanel.analysesTab")}</span>
                  <span className="sm:hidden">{t("studentAcademicPanel.analysesTabShort")}</span>
                  {analyses ? ` (${analyses.length})` : ""}
                </span>
              </TabsTrigger>
            </TabsList>

            {/* TASKS */}
            <TabsContent value="tasks" className="space-y-3">
              {(!tasks || tasks.length === 0) && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {t("studentAcademicPanel.noTasks")}
                </div>
              )}
              {taskGroups.length > 0 && (
                <>
                  {taskGroups.map(({ key, semester, category, items }) => {
                    return (
                      <div key={key} className="rounded-md border border-border">
                        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
                          <span className="font-medium">
                            {semester === "fall"
                              ? t("common.semesterFall")
                              : t("common.semesterSpring")}
                          </span>
                          <TaskCategoryBadge category={category} />
                        </div>
                        <div>
                          {items.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => setSelectedTaskId(task.id)}
                              className="flex w-full items-start gap-2 sm:gap-3 border-b border-border p-3 text-left last:border-0 hover:bg-muted/30 min-w-0"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium leading-snug break-words text-sm sm:text-base">
                                  {task.template_title}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                  <TaskTypeLabel type={task.template_type} />
                                  {task.template_quantity > 1 && (
                                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                                      {t("studentAcademicPanel.quantity", {
                                        count: task.template_quantity,
                                      })}
                                    </Badge>
                                  )}
                                  {task.template_month_hint && (
                                    <span className="text-[11px] sm:text-xs">
                                      {task.template_month_hint}
                                    </span>
                                  )}
                                  {task.due_date && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] sm:text-xs",
                                        isOverdue(task, today)
                                          ? "border-destructive/50 text-destructive"
                                          : "",
                                      )}
                                    >
                                      {t("studentAcademicPanel.deadline", {
                                        date: formatTashkentDate(task.due_date, locale),
                                      })}
                                    </Badge>
                                  )}
                                </div>
                                {task.notes && (
                                  <div className="mt-1 text-xs text-muted-foreground break-words">
                                    {task.notes}
                                  </div>
                                )}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <TaskStatusBadge status={task.status} />
                                <span className="font-mono text-xs text-muted-foreground sm:text-foreground">
                                  {task.points_earned ?? "—"}/{task.template_points}
                                </span>
                              </div>
                            </button>
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
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  setJournalEdit(null);
                  setJournalOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("studentAcademicPanel.newJournal")}
              </Button>

              {(!journal || journal.length === 0) && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {t("studentAcademicPanel.noJournal")}
                </div>
              )}
              {journal?.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => {
                    setJournalEdit(j);
                    setJournalOpen(true);
                  }}
                  className="w-full rounded-md border border-border p-3 text-left hover:bg-muted/30 min-w-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-xs text-muted-foreground">
                      {formatTashkentDate(j.date, locale)}
                    </div>
                    <JournalStatusBadge status={j.status} />
                  </div>
                  <div className="mt-2 line-clamp-2 text-xs sm:text-sm break-words">
                    {j.content_md}
                  </div>
                  {j.rejection_reason && (
                    <div className="mt-2 rounded-md bg-destructive/5 px-2 py-1 text-xs text-destructive break-words">
                      {t("studentAcademicPanel.reason", {
                        reason: j.rejection_reason,
                      })}
                    </div>
                  )}
                </button>
              ))}
            </TabsContent>

            {/* ANALYSES */}
            <TabsContent value="analyses" className="space-y-2">
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  setAnalysisEdit(null);
                  setAnalysisOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("studentAcademicPanel.newAnalysis")}
              </Button>

              {(!analyses || analyses.length === 0) && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {t("studentAcademicPanel.noAnalyses")}
                </div>
              )}
              {analyses?.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setAnalysisEdit(a);
                    setAnalysisOpen(true);
                  }}
                  className="w-full rounded-md border border-border p-3 text-left hover:bg-muted/30 min-w-0"
                >
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <div className="font-medium text-xs sm:text-sm break-words">{a.subject}</div>
                    <span className="text-xs text-muted-foreground truncate">
                      · {a.teacher_name}
                    </span>
                    {a.grade_level && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {a.grade_level}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      {t("studentAcademicPanel.quarterN", { n: a.quarter })}
                    </Badge>
                    <JournalStatusBadge status={a.status} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatTashkentDate(a.date, locale)}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs sm:text-sm break-words">
                    {a.analysis_md}
                  </div>
                  {a.rejection_reason && (
                    <div className="mt-2 rounded-md bg-destructive/5 px-2 py-1 text-xs text-destructive break-words">
                      {t("studentAcademicPanel.reason", {
                        reason: a.rejection_reason,
                      })}
                    </div>
                  )}
                </button>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <StudentTaskSubmitDialog task={selectedTask} onClose={() => setSelectedTaskId(null)} />
      <JournalFormDialog
        open={journalOpen}
        assignmentId={assignmentId}
        entry={journalEdit}
        onClose={() => {
          setJournalOpen(false);
          setJournalEdit(null);
        }}
      />
      <LessonAnalysisFormDialog
        open={analysisOpen}
        assignmentId={assignmentId}
        analysis={analysisEdit}
        onClose={() => {
          setAnalysisOpen(false);
          setAnalysisEdit(null);
        }}
      />
    </>
  );
}
