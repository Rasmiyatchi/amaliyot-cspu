import { HTTPError } from "ky";
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  NotebookPen,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useApproveJournal,
  useApproveLessonAnalysis,
  useApproveTask,
  useAssignmentTasks,
  useJournal,
  useLessonAnalyses,
  useRejectJournal,
  useRejectLessonAnalysis,
  useRejectTask,
} from "@/lib/api/tasks";
import type { JournalEntry, LessonAnalysis, Task, UUID } from "@/lib/api/types";

type Props = {
  assignmentId: UUID;
};

export function SupervisorReviewPanel({ assignmentId }: Props) {
  const { data: tasks } = useAssignmentTasks(assignmentId);
  const { data: journal } = useJournal(assignmentId);
  const { data: analyses } = useLessonAnalyses(assignmentId);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<LessonAnalysis | null>(null);

  // Tartiblash: submitted avval, keyin rejected, approved oxiri
  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    const order: Record<string, number> = {
      submitted: 0,
      rejected: 1,
      not_started: 2,
      approved: 3,
    };
    return [...tasks].sort((a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99));
  }, [tasks]);

  const pendingCount =
    (tasks?.filter((t) => t.status === "submitted").length ?? 0) +
    (journal?.filter((j) => j.status === "submitted").length ?? 0) +
    (analyses?.filter((a) => a.status === "submitted").length ?? 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span>Ko'rib chiqish</span>
            {pendingCount > 0 && (
              <Badge variant="warning">{pendingCount} kutilmoqda</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            <TabsContent value="tasks" className="space-y-2">
              {sortedTasks.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Topshiriqlar yo'q
                </div>
              )}
              {sortedTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className="flex w-full items-start gap-3 rounded-md border border-border p-3 text-left hover:bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium leading-snug">{t.template_title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <TaskCategoryBadge category={t.template_category} />
                      <TaskTypeLabel type={t.template_type} />
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
            </TabsContent>

            {/* JOURNAL */}
            <TabsContent value="journal" className="space-y-2">
              {(!journal || journal.length === 0) && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Kundalik yozuvlari yo'q
                </div>
              )}
              {journal?.map((j) => (
                <button
                  key={j.id}
                  onClick={() => setSelectedJournal(j)}
                  className="w-full rounded-md border border-border p-3 text-left hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-xs text-muted-foreground">
                      {new Date(j.date).toLocaleDateString("uz-UZ")}
                    </div>
                    <JournalStatusBadge status={j.status} />
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm">{j.content_md}</div>
                </button>
              ))}
            </TabsContent>

            {/* ANALYSES */}
            <TabsContent value="analyses" className="space-y-2">
              {(!analyses || analyses.length === 0) && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Dars tahlili yo'q
                </div>
              )}
              {analyses?.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAnalysis(a)}
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
                  <div className="mt-1 line-clamp-2 text-sm">{a.analysis_md}</div>
                </button>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <TaskReviewDialog task={selectedTask} onClose={() => setSelectedTask(null)} />
      <JournalReviewDialog entry={selectedJournal} onClose={() => setSelectedJournal(null)} />
      <AnalysisReviewDialog analysis={selectedAnalysis} onClose={() => setSelectedAnalysis(null)} />
    </>
  );
}


// ─── Task review ────────────────────────────────────────

function TaskReviewDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const approve = useApproveTask();
  const reject = useRejectTask();

  const busy = approve.isPending || reject.isPending;
  if (!task) return null;

  const handleApprove = async () => {
    const parsed = points === "" ? null : Number(points);
    if (parsed !== null && (parsed < 0 || parsed > task.template_points)) {
      toast.error(`Ball 0–${task.template_points} oralig'ida`);
      return;
    }
    try {
      await approve.mutateAsync({ id: task.id, data: { points_earned: parsed } });
      toast.success("Tasdiqlandi");
      setPoints("");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleReject = async () => {
    if (reason.trim().length < 3) {
      toast.error("Sababni yozing");
      return;
    }
    try {
      await reject.mutateAsync({ id: task.id, data: { rejection_reason: reason.trim() } });
      toast.success("Rad etildi");
      setReason("");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.template_title}</DialogTitle>
          <DialogDescription>
            Max {task.template_points} ball{" "}
            {task.template_quantity > 1 && `· ${task.template_quantity} ta`}
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Talaba javobi
          </div>
          {task.submission_md ? (
            <div className="whitespace-pre-wrap rounded-md border border-border p-3 text-sm">
              {task.submission_md}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Hali yuborilmagan
            </div>
          )}
        </div>

        {task.status !== "not_started" && (
          <>
            <Separator />
            <div className="space-y-3">
              <div>
                <Label htmlFor="rev-points">Ball (0–{task.template_points})</Label>
                <Input
                  id="rev-points"
                  type="number"
                  min={0}
                  max={task.template_points}
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder={String(task.points_earned ?? "")}
                />
              </div>
              <div>
                <Label htmlFor="rev-reason">Rad etish sababi</Label>
                <textarea
                  id="rev-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Yopish
          </Button>
          {task.status !== "not_started" && (
            <>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={busy || reason.trim().length < 3}
              >
                {reject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <XCircle className="h-4 w-4" />
                Rad etish
              </Button>
              <Button onClick={handleApprove} disabled={busy}>
                {approve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle2 className="h-4 w-4" />
                Tasdiqlash
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ─── Journal review ─────────────────────────────────────

function JournalReviewDialog({
  entry,
  onClose,
}: {
  entry: JournalEntry | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const approve = useApproveJournal();
  const reject = useRejectJournal();
  if (!entry) return null;

  const busy = approve.isPending || reject.isPending;

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(entry.id);
      toast.success("Tasdiqlandi");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleReject = async () => {
    if (reason.trim().length < 3) {
      toast.error("Sababni yozing");
      return;
    }
    try {
      await reject.mutateAsync({ id: entry.id, data: { rejection_reason: reason.trim() } });
      toast.success("Rad etildi");
      setReason("");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kundalik ({new Date(entry.date).toLocaleDateString("uz-UZ")})</DialogTitle>
          <DialogDescription>
            <JournalStatusBadge status={entry.status} />
          </DialogDescription>
        </DialogHeader>

        <div className="whitespace-pre-wrap rounded-md border border-border p-3 text-sm">
          {entry.content_md}
        </div>

        {entry.status === "submitted" && (
          <>
            <Separator />
            <div>
              <Label htmlFor="jrev-reason">Rad etish sababi (agar kerak)</Label>
              <textarea
                id="jrev-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </>
        )}

        {entry.rejection_reason && (
          <Alert variant="destructive">
            <AlertDescription>{entry.rejection_reason}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Yopish
          </Button>
          {entry.status === "submitted" && (
            <>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={busy || reason.trim().length < 3}
              >
                <XCircle className="h-4 w-4" />
                Rad etish
              </Button>
              <Button onClick={handleApprove} disabled={busy}>
                <CheckCircle2 className="h-4 w-4" />
                Tasdiqlash
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ─── Analysis review ────────────────────────────────────

function AnalysisReviewDialog({
  analysis,
  onClose,
}: {
  analysis: LessonAnalysis | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const approve = useApproveLessonAnalysis();
  const reject = useRejectLessonAnalysis();
  if (!analysis) return null;

  const busy = approve.isPending || reject.isPending;

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(analysis.id);
      toast.success("Tasdiqlandi");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleReject = async () => {
    if (reason.trim().length < 3) {
      toast.error("Sababni yozing");
      return;
    }
    try {
      await reject.mutateAsync({
        id: analysis.id,
        data: { rejection_reason: reason.trim() },
      });
      toast.success("Rad etildi");
      setReason("");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  return (
    <Dialog open={!!analysis} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {analysis.subject} — {analysis.teacher_name}
          </DialogTitle>
          <DialogDescription>
            {new Date(analysis.date).toLocaleDateString("uz-UZ")} · {analysis.quarter}-chorak
            {analysis.grade_level && ` · ${analysis.grade_level}`}
          </DialogDescription>
        </DialogHeader>

        <div className="whitespace-pre-wrap rounded-md border border-border p-3 text-sm">
          {analysis.analysis_md}
        </div>

        {analysis.status === "submitted" && (
          <>
            <Separator />
            <div>
              <Label htmlFor="arev-reason">Rad etish sababi</Label>
              <textarea
                id="arev-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </>
        )}

        {analysis.rejection_reason && (
          <Alert variant="destructive">
            <AlertDescription>{analysis.rejection_reason}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Yopish
          </Button>
          {analysis.status === "submitted" && (
            <>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={busy || reason.trim().length < 3}
              >
                <XCircle className="h-4 w-4" />
                Rad etish
              </Button>
              <Button onClick={handleApprove} disabled={busy}>
                <CheckCircle2 className="h-4 w-4" />
                Tasdiqlash
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
