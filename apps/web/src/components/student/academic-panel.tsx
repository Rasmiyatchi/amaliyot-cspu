import { BookOpen, NotebookPen, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import {
  JournalStatusBadge,
  TaskStatusBadge,
} from "@/components/admin/tasks/task-status-badge";
import {
  TaskCategoryBadge,
  TaskTypeLabel,
} from "@/components/admin/tasks/task-type-badge";
import { LessonAnalysisFormDialog } from "@/components/student/analysis-form-dialog";
import { JournalFormDialog } from "@/components/student/journal-form-dialog";
import { StudentTaskSubmitDialog } from "@/components/student/task-submit-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAssignmentProgress,
  useAssignmentTasks,
  useJournal,
  useLessonAnalyses,
} from "@/lib/api/tasks";
import type { JournalEntry, LessonAnalysis, Task, UUID } from "@/lib/api/types";

type Props = {
  assignmentId: UUID;
};

export function StudentAcademicPanel({ assignmentId }: Props) {
  const { data: tasks } = useAssignmentTasks(assignmentId);
  const { data: progress } = useAssignmentProgress(assignmentId);
  const { data: journal } = useJournal(assignmentId);
  const { data: analyses } = useLessonAnalyses(assignmentId);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalEdit, setJournalEdit] = useState<JournalEntry | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisEdit, setAnalysisEdit] = useState<LessonAnalysis | null>(null);

  const pointsPercent =
    progress && progress.tasks_max_points > 0
      ? Math.min(100, Math.round((progress.tasks_earned_points / progress.tasks_max_points) * 100))
      : 0;

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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">O'quv ishlari progress</CardTitle>
        </CardHeader>
        <CardContent>
          {progress && (
            <>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Jami ball</span>
                <span className="font-mono font-semibold">
                  {progress.tasks_earned_points} / {progress.tasks_max_points}
                </span>
              </div>
              <Progress value={pointsPercent} className="h-2" />
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-muted/40 px-2 py-1.5 text-center">
                  <div className="text-muted-foreground">Tasdiqlangan</div>
                  <div className="font-semibold text-success">
                    {progress.tasks_by_status.approved}
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5 text-center">
                  <div className="text-muted-foreground">Yuborilgan</div>
                  <div className="font-semibold text-info">
                    {progress.tasks_by_status.submitted}
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5 text-center">
                  <div className="text-muted-foreground">Rad etilgan</div>
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
            <TabsList>
              <TabsTrigger value="tasks">
                <BookOpen className="h-3.5 w-3.5" />
                Topshiriqlar {tasks ? `(${tasks.length})` : ""}
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
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Topshiriqlar yo'q. Admin bilan bog'laning.
                </div>
              )}
              {tasks && tasks.length > 0 && (
                <>
                  {Array.from(tasksByGroup.keys())
                    .sort()
                    .map((key) => {
                      const [sem, cat] = key.split("|");
                      const items = tasksByGroup.get(key)!;
                      return (
                        <div key={key} className="rounded-md border border-border">
                          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
                            <span className="font-medium">
                              {sem === "fall" ? "Kuzgi" : "Bahorgi"}
                            </span>
                            <TaskCategoryBadge category={cat as "spiritual" | "academic" | "report"} />
                          </div>
                          <div>
                            {items.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setSelectedTask(t)}
                                className="flex w-full items-start gap-3 border-b border-border p-3 text-left last:border-0 hover:bg-muted/30"
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
                onClick={() => {
                  setJournalEdit(null);
                  setJournalOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Yangi kundalik
              </Button>

              {(!journal || journal.length === 0) && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Kundalik yozuvlari yo'q
                </div>
              )}
              {journal?.map((j) => (
                <button
                  key={j.id}
                  onClick={() => {
                    setJournalEdit(j);
                    setJournalOpen(true);
                  }}
                  className="w-full rounded-md border border-border p-3 text-left hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-xs text-muted-foreground">
                      {new Date(j.date).toLocaleDateString("uz-UZ")}
                    </div>
                    <JournalStatusBadge status={j.status} />
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm">{j.content_md}</div>
                  {j.rejection_reason && (
                    <div className="mt-2 rounded-md bg-destructive/5 px-2 py-1 text-xs text-destructive">
                      Sabab: {j.rejection_reason}
                    </div>
                  )}
                </button>
              ))}
            </TabsContent>

            {/* ANALYSES */}
            <TabsContent value="analyses" className="space-y-2">
              <Button
                size="sm"
                onClick={() => {
                  setAnalysisEdit(null);
                  setAnalysisOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Yangi dars tahlili
              </Button>

              {(!analyses || analyses.length === 0) && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Dars tahlili yo'q
                </div>
              )}
              {analyses?.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setAnalysisEdit(a);
                    setAnalysisOpen(true);
                  }}
                  className="w-full rounded-md border border-border p-3 text-left hover:bg-muted/30"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{a.subject}</div>
                    <span className="text-xs text-muted-foreground">· {a.teacher_name}</span>
                    {a.grade_level && (
                      <Badge variant="outline" className="text-xs">
                        {a.grade_level}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {a.quarter}-chorak
                    </Badge>
                    <JournalStatusBadge status={a.status} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(a.date).toLocaleDateString("uz-UZ")}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm">{a.analysis_md}</div>
                  {a.rejection_reason && (
                    <div className="mt-2 rounded-md bg-destructive/5 px-2 py-1 text-xs text-destructive">
                      Sabab: {a.rejection_reason}
                    </div>
                  )}
                </button>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <StudentTaskSubmitDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
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
