import { HTTPError } from "ky";
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  NotebookPen,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  JournalStatusBadge,
  TaskStatusBadge,
} from "@/components/admin/tasks/task-status-badge";
import {
  TaskCategoryBadge,
  TaskTypeLabel,
} from "@/components/admin/tasks/task-type-badge";
import { formatTashkentDate } from "@/components/attendance/attendance-date-utils";
import { AttachmentsSection } from "@/components/attachments-section";
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
import { ListSkeleton } from "@/components/ui/loading-skeletons";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { dateLocale } from "@/i18n";
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
import type { JournalEntry, JournalStatus, LessonAnalysis, Task, UUID } from "@/lib/api/types";

type Props = {
  assignmentId: UUID;
};

/** Backend `TaskRejectRequest` / `JournalRejectRequest`: 3..2000 belgi. */
const REASON_MIN = 3;
const REASON_MAX = 2000;

const TASK_ORDER: Record<Task["status"], number> = {
  submitted: 0,
  rejected: 1,
  not_started: 2,
  approved: 3,
};

const ENTRY_ORDER: Record<JournalStatus, number> = {
  submitted: 0,
  rejected: 1,
  draft: 2,
  approved: 3,
};

/** Kutilayotganlar (submitted) avval, keyin sana bo'yicha yangisi yuqorida. */
function sortEntries<T extends { status: JournalStatus; date: string }>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) => ENTRY_ORDER[a.status] - ENTRY_ORDER[b.status] || b.date.localeCompare(a.date),
  );
}

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof HTTPError ? e.message : fallback;
}

/** Tab ro'yxati holatlari: yuklanmoqda / xato / bo'sh / ma'lumot. */
function ListState({
  isPending,
  error,
  isEmpty,
  emptyText,
  children,
}: {
  isPending: boolean;
  error: Error | null;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  if (isPending) return <ListSkeleton count={3} />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }
  if (isEmpty) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return <>{children}</>;
}

function TabCount({ total, pending }: { total: number | undefined; pending: number }) {
  const { t } = useTranslation();
  if (total === undefined) return null;
  return (
    <>
      <span className="text-muted-foreground">({total})</span>
      {pending > 0 && (
        <>
          <span
            aria-hidden="true"
            className="ml-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold leading-4 text-white dark:bg-amber-600"
          >
            {pending}
          </span>
          <span className="sr-only">
            {t("supervisorReviewPanel.pendingCount", { count: pending })}
          </span>
        </>
      )}
    </>
  );
}

export function SupervisorReviewPanel({ assignmentId }: Props) {
  const { t } = useTranslation();
  const tasksQuery = useAssignmentTasks(assignmentId);
  const journalQuery = useJournal(assignmentId);
  const analysesQuery = useLessonAnalyses(assignmentId);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<LessonAnalysis | null>(null);

  const tasks = tasksQuery.data;
  const journal = journalQuery.data;
  const analyses = analysesQuery.data;

  const sortedTasks = useMemo(
    () => (tasks ? [...tasks].sort((a, b) => TASK_ORDER[a.status] - TASK_ORDER[b.status]) : []),
    [tasks],
  );
  const sortedJournal = useMemo(() => (journal ? sortEntries(journal) : []), [journal]);
  const sortedAnalyses = useMemo(() => (analyses ? sortEntries(analyses) : []), [analyses]);

  const pendingTasks = tasks?.filter((x) => x.status === "submitted").length ?? 0;
  const pendingJournal = journal?.filter((x) => x.status === "submitted").length ?? 0;
  const pendingAnalyses = analyses?.filter((x) => x.status === "submitted").length ?? 0;
  const pendingCount = pendingTasks + pendingJournal + pendingAnalyses;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <span>{t("supervisorReviewPanel.title")}</span>
            {pendingCount > 0 && (
              <Badge variant="warning">
                {t("supervisorReviewPanel.pendingCount", { count: pendingCount })}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tasks">
            <TabsList>
              <TabsTrigger value="tasks" className="gap-1">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                {t("supervisorReviewPanel.tabs.tasks")}
                <TabCount total={tasks?.length} pending={pendingTasks} />
              </TabsTrigger>
              <TabsTrigger value="journal" className="gap-1">
                <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
                {t("supervisorReviewPanel.tabs.journal")}
                <TabCount total={journal?.length} pending={pendingJournal} />
              </TabsTrigger>
              <TabsTrigger value="analyses" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t("supervisorReviewPanel.tabs.analyses")}
                <TabCount total={analyses?.length} pending={pendingAnalyses} />
              </TabsTrigger>
            </TabsList>

            {/* TASKS */}
            <TabsContent value="tasks" className="space-y-2">
              <ListState
                isPending={tasksQuery.isPending}
                error={tasksQuery.error}
                isEmpty={sortedTasks.length === 0}
                emptyText={t("supervisorReviewPanel.emptyTasks")}
              >
                {sortedTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedTask(task)}
                    className="flex w-full items-start gap-3 rounded-md border border-border p-3 text-left hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium leading-snug break-words">{task.template_title}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <TaskCategoryBadge category={task.template_category} />
                        <TaskTypeLabel type={task.template_type} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <TaskStatusBadge status={task.status} />
                      <span className="font-mono text-xs">
                        {task.points_earned ?? "—"}/{task.template_points}
                      </span>
                    </div>
                  </button>
                ))}
              </ListState>
            </TabsContent>

            {/* JOURNAL */}
            <TabsContent value="journal" className="space-y-2">
              <ListState
                isPending={journalQuery.isPending}
                error={journalQuery.error}
                isEmpty={sortedJournal.length === 0}
                emptyText={t("supervisorReviewPanel.emptyJournal")}
              >
                {sortedJournal.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setSelectedJournal(j)}
                    className="w-full rounded-md border border-border p-3 text-left hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-xs text-muted-foreground">
                        {formatTashkentDate(j.date, dateLocale())}
                      </div>
                      <JournalStatusBadge status={j.status} />
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm break-words">{j.content_md || "—"}</div>
                  </button>
                ))}
              </ListState>
            </TabsContent>

            {/* ANALYSES */}
            <TabsContent value="analyses" className="space-y-2">
              <ListState
                isPending={analysesQuery.isPending}
                error={analysesQuery.error}
                isEmpty={sortedAnalyses.length === 0}
                emptyText={t("supervisorReviewPanel.emptyAnalyses")}
              >
                {sortedAnalyses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAnalysis(a)}
                    className="w-full rounded-md border border-border p-3 text-left hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium break-words">{a.subject}</div>
                      <span className="text-xs text-muted-foreground">· {a.teacher_name}</span>
                      {a.grade_level && (
                        <Badge variant="outline" className="text-xs">
                          {a.grade_level}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {t("supervisorReviewPanel.quarterN", { n: a.quarter })}
                      </Badge>
                      <JournalStatusBadge status={a.status} />
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm break-words">{a.analysis_md || "—"}</div>
                  </button>
                ))}
              </ListState>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* `key` — boshqa elementga o'tilganda forma (ball, sabab) yangidan boshlanadi */}
      {selectedTask && (
        <TaskReviewDialog
          key={selectedTask.id}
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
      {selectedJournal && (
        <JournalReviewDialog
          key={selectedJournal.id}
          entry={selectedJournal}
          onClose={() => setSelectedJournal(null)}
        />
      )}
      {selectedAnalysis && (
        <AnalysisReviewDialog
          key={selectedAnalysis.id}
          analysis={selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
        />
      )}
    </>
  );
}

// ─── Rad etish sababi (majburiy) ────────────────────────

function RejectReasonField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div>
      <Label htmlFor={`${id}-reason`}>{t("supervisorReviewPanel.rejectReasonLabel")}</Label>
      <Textarea
        id={`${id}-reason`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={REASON_MAX}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        className="mt-1"
      />
      <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
        {t("supervisorReviewPanel.reasonHint", { min: REASON_MIN })}
      </p>
    </div>
  );
}

// ─── Task review ────────────────────────────────────────

function TaskReviewDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const { t } = useTranslation();
  const pointsId = useId();
  // Avval qo'yilgan ball bo'lsa (masalan, rad etilib qayta yuborilgan) — oldindan to'ldiriladi
  const [points, setPoints] = useState(task.points_earned !== null ? String(task.points_earned) : "");
  const [reason, setReason] = useState("");
  const approve = useApproveTask();
  const reject = useRejectTask();

  const busy = approve.isPending || reject.isPending;
  const reviewable = task.status === "submitted" || task.status === "rejected";
  // Ma'naviy topshiriqlar balli ixtiyoriy (bo'sh bo'lsa shablon bali hisoblanadi);
  // qolganlarida backend ballsiz tasdiqni 400 bilan rad etadi.
  const pointsRequired = task.template_category !== "spiritual";

  const trimmed = points.trim();
  const parsed = /^\d+$/.test(trimmed) ? Number(trimmed) : null;
  const pointsInRange = parsed !== null && parsed <= task.template_points;
  const pointsValid = trimmed === "" ? !pointsRequired : pointsInRange;
  const reasonValid = reason.trim().length >= REASON_MIN;

  const handleApprove = async () => {
    if (!pointsValid) {
      toast.error(
        trimmed === ""
          ? t("supervisorReviewPanel.pointsRequired")
          : t("supervisorReviewPanel.pointsRange", { max: task.template_points }),
      );
      return;
    }
    try {
      await approve.mutateAsync({ id: task.id, data: { points_earned: parsed } });
      toast.success(t("supervisorReviewPanel.approvedToast"));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    }
  };

  const handleReject = async () => {
    if (!reasonValid) {
      toast.error(t("supervisorReviewPanel.reasonRequired"));
      return;
    }
    try {
      await reject.mutateAsync({ id: task.id, data: { rejection_reason: reason.trim() } });
      toast.success(t("supervisorReviewPanel.rejectedToast"));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6 break-words">{task.template_title}</DialogTitle>
          <DialogDescription>
            {t("supervisorReviewPanel.maxPoints", { points: task.template_points })}{" "}
            {task.template_quantity > 1 &&
              t("supervisorReviewPanel.quantityTimes", { count: task.template_quantity })}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("supervisorReviewPanel.studentAnswer")}
          </div>
          {task.submission_md ? (
            <div className="whitespace-pre-wrap break-words rounded-md border border-border p-3 text-sm">
              {task.submission_md}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {t("supervisorReviewPanel.notSubmitted")}
            </div>
          )}

          <div className="mt-4">
            <AttachmentsSection
              kind="task"
              entityId={task.id}
              attachments={task.attachments ?? []}
              canEdit={false}
            />
          </div>
        </div>

        {task.status === "approved" && (
          <Alert className="border-success/30 bg-success/5 py-2.5 px-3">
            <AlertDescription>
              <div className="font-medium text-xs sm:text-sm">{t("studentTaskSubmitDialog.approvedTitle")}</div>
              {task.points_earned !== null && (
                <div className="mt-1 text-xs sm:text-sm font-mono">
                  {t("studentTaskSubmitDialog.points", {
                    earned: task.points_earned,
                    max: task.template_points,
                  })}
                </div>
              )}
              <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground">
                {t("supervisorReviewPanel.approvedLocked")}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {task.rejection_reason && task.status === "rejected" && (
          <Alert variant="destructive">
            <AlertDescription className="break-words">{task.rejection_reason}</AlertDescription>
          </Alert>
        )}

        {reviewable && (
          <>
            <Separator />
            <div className="space-y-3">
              <div>
                <Label htmlFor={pointsId}>
                  {pointsRequired
                    ? t("supervisorReviewPanel.pointsLabelRequired", { max: task.template_points })
                    : t("supervisorReviewPanel.pointsLabelOptional", { max: task.template_points })}
                </Label>
                <Input
                  id={pointsId}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={task.template_points}
                  step={1}
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  disabled={busy}
                  aria-invalid={trimmed !== "" && !pointsInRange}
                  aria-describedby={`${pointsId}-hint`}
                  className="mt-1 w-32"
                />
                <p id={`${pointsId}-hint`} className="mt-1 text-xs text-muted-foreground">
                  {trimmed !== "" && !pointsInRange
                    ? t("supervisorReviewPanel.pointsRange", { max: task.template_points })
                    : pointsRequired
                      ? t("supervisorReviewPanel.pointsRequiredHint")
                      : t("supervisorReviewPanel.pointsOptionalHint", { max: task.template_points })}
                </p>
              </div>
              <RejectReasonField value={reason} onChange={setReason} disabled={busy} />
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.close")}
          </Button>
          {reviewable && (
            <>
              <Button variant="destructive" onClick={handleReject} disabled={busy || !reasonValid}>
                {reject.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t("common.reject")}
              </Button>
              <Button onClick={handleApprove} disabled={busy || !pointsValid}>
                {approve.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {parsed !== null && pointsInRange
                  ? t("supervisorReviewPanel.approveWithPoints", {
                      points: parsed,
                      max: task.template_points,
                    })
                  : t("common.approve")}
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
  entry: JournalEntry;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const approve = useApproveJournal();
  const reject = useRejectJournal();

  const busy = approve.isPending || reject.isPending;
  const reasonValid = reason.trim().length >= REASON_MIN;

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(entry.id);
      toast.success(t("supervisorReviewPanel.approvedToast"));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    }
  };

  const handleReject = async () => {
    if (!reasonValid) {
      toast.error(t("supervisorReviewPanel.reasonRequired"));
      return;
    }
    try {
      await reject.mutateAsync({ id: entry.id, data: { rejection_reason: reason.trim() } });
      toast.success(t("supervisorReviewPanel.rejectedToast"));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {t("supervisorReviewPanel.journalDialogTitle", {
              date: formatTashkentDate(entry.date, dateLocale()),
            })}
          </DialogTitle>
          {/* Badge blok element bo'lishi mumkin — tavsif <p> emas, <div> sifatida chiziladi */}
          <DialogDescription asChild>
            <div className="flex items-center gap-2">
              <span>{t("common.status")}:</span>
              <JournalStatusBadge status={entry.status} />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="whitespace-pre-wrap break-words rounded-md border border-border p-3 text-sm">
          {entry.content_md || "—"}
        </div>

        {entry.attachments && entry.attachments.length > 0 && (
          <AttachmentsSection
            kind="journal"
            entityId={entry.id}
            attachments={entry.attachments}
            canEdit={false}
          />
        )}

        {entry.rejection_reason && (
          <Alert variant="destructive">
            <AlertDescription className="break-words">{entry.rejection_reason}</AlertDescription>
          </Alert>
        )}

        {entry.status === "submitted" && (
          <>
            <Separator />
            <RejectReasonField value={reason} onChange={setReason} disabled={busy} />
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.close")}
          </Button>
          {entry.status === "submitted" && (
            <>
              <Button variant="destructive" onClick={handleReject} disabled={busy || !reasonValid}>
                {reject.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t("common.reject")}
              </Button>
              <Button onClick={handleApprove} disabled={busy}>
                {approve.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {t("common.approve")}
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
  analysis: LessonAnalysis;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const approve = useApproveLessonAnalysis();
  const reject = useRejectLessonAnalysis();

  const busy = approve.isPending || reject.isPending;
  const reasonValid = reason.trim().length >= REASON_MIN;

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(analysis.id);
      toast.success(t("supervisorReviewPanel.approvedToast"));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    }
  };

  const handleReject = async () => {
    if (!reasonValid) {
      toast.error(t("supervisorReviewPanel.reasonRequired"));
      return;
    }
    try {
      await reject.mutateAsync({
        id: analysis.id,
        data: { rejection_reason: reason.trim() },
      });
      toast.success(t("supervisorReviewPanel.rejectedToast"));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6 break-words">
            {analysis.subject} — {analysis.teacher_name}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {formatTashkentDate(analysis.date, dateLocale())} ·{" "}
                {t("supervisorReviewPanel.quarterN", { n: analysis.quarter })}
                {analysis.grade_level && ` · ${analysis.grade_level}`}
              </span>
              <JournalStatusBadge status={analysis.status} />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="whitespace-pre-wrap break-words rounded-md border border-border p-3 text-sm">
          {analysis.analysis_md || "—"}
        </div>

        {analysis.attachments && analysis.attachments.length > 0 && (
          <AttachmentsSection
            kind="analysis"
            entityId={analysis.id}
            attachments={analysis.attachments}
            canEdit={false}
          />
        )}

        {analysis.rejection_reason && (
          <Alert variant="destructive">
            <AlertDescription className="break-words">{analysis.rejection_reason}</AlertDescription>
          </Alert>
        )}

        {analysis.status === "submitted" && (
          <>
            <Separator />
            <RejectReasonField value={reason} onChange={setReason} disabled={busy} />
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.close")}
          </Button>
          {analysis.status === "submitted" && (
            <>
              <Button variant="destructive" onClick={handleReject} disabled={busy || !reasonValid}>
                {reject.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t("common.reject")}
              </Button>
              <Button onClick={handleApprove} disabled={busy}>
                {approve.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {t("common.approve")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
