import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Undo2, XCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AttachmentsSection } from "@/components/attachments-section";
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
import { formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { dateLocale } from "@/i18n";
import { gradingKeys } from "@/lib/api/grading";
import { useApproveTask, useRejectTask, useRevertTask } from "@/lib/api/tasks";
import type { Task } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Props = {
  task: Task | null;
  onClose: () => void;
};

export function TaskGradeDialog({ task, onClose }: Props) {
  if (!task) return null;
  // `key` — har topshiriq uchun toza holat: oldingi topshiriqning bali yoki rad
  // sababi keyingisiga o'tib ketmasin.
  return <TaskGradeDialogBody key={task.id} task={task} onClose={onClose} />;
}

function TaskGradeDialogBody({ task, onClose }: { task: Task; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [points, setPoints] = useState<string>(
    task.points_earned !== null ? String(task.points_earned) : "",
  );
  const [reason, setReason] = useState<string>("");

  const approve = useApproveTask();
  const reject = useRejectTask();
  const revert = useRevertTask();

  const busy = approve.isPending || reject.isPending || revert.isPending;
  const max = task.template_points;

  // Ma'naviy topshiriqlar ballsiz tasdiqlanadi (backend shablon balini oladi);
  // qolganlarida ball majburiy — bo'sh qoldirilsa backend 400 qaytaradi.
  const pointsRequired = task.template_category !== "spiritual";
  const trimmedPoints = points.trim();
  const parsedPoints = trimmedPoints === "" ? null : Number(trimmedPoints);
  const pointsInRange =
    parsedPoints !== null &&
    Number.isInteger(parsedPoints) &&
    parsedPoints >= 0 &&
    parsedPoints <= max;
  const pointsValid = parsedPoints === null ? !pointsRequired : pointsInRange;
  const showPointsError = trimmedPoints !== "" && !pointsInRange;

  // Topshiriq bali yakuniy bahoning "O'quv topshiriqlar" mezoniga kiradi
  const refreshGrade = () =>
    qc.invalidateQueries({ queryKey: gradingKeys.breakdown(task.assignment_id) });

  // ky HTTPError'ning message'iga server `detail`i yoziladi (lib/api.ts)
  const errorMessage = (e: unknown) => (e instanceof Error ? e.message : t("common.error"));

  const handleApprove = async () => {
    if (!pointsValid) {
      toast.error(t("assignmentsTaskGradeDialog.pointsRange", { max }));
      return;
    }
    try {
      await approve.mutateAsync({
        id: task.id,
        data: { points_earned: parsedPoints },
      });
      void refreshGrade();
      toast.success(t("assignmentsTaskGradeDialog.approvedToast"));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleReject = async () => {
    if (reason.trim().length < 3) {
      toast.error(t("assignmentsTaskGradeDialog.reasonRequired"));
      return;
    }
    try {
      await reject.mutateAsync({
        id: task.id,
        data: { rejection_reason: reason.trim() },
      });
      void refreshGrade();
      toast.success(t("assignmentsTaskGradeDialog.rejectedToast"));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleRevert = async () => {
    try {
      await revert.mutateAsync(task.id);
      void refreshGrade();
      toast.success(t("assignmentsTaskGradeDialog.revertedToast"));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.template_title}</DialogTitle>
          <DialogDescription>
            {t("common.courseN", { n: task.template_course })} ·{" "}
            {task.template_semester === "fall"
              ? t("common.semesterFall")
              : t("common.semesterSpring")}
            {" · "}
            {t("assignmentsTaskGradeDialog.maxPoints", { points: max })}
            {task.template_quantity > 1 &&
              t("assignmentsTaskGradeDialog.quantityTimes", { count: task.template_quantity })}
          </DialogDescription>
        </DialogHeader>

        {task.template_description && (
          <div className="rounded-md bg-muted/30 p-3 text-sm">
            {task.template_description}
          </div>
        )}

        <Separator />

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("assignmentsTaskGradeDialog.studentAnswer")}
          </div>
          {task.submission_md ? (
            <div className="whitespace-pre-wrap break-words rounded-md border border-border p-3 text-sm">
              {task.submission_md}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {t("assignmentsTaskGradeDialog.notSubmitted")}
            </div>
          )}

          {task.submitted_at && (
            <div className="mt-2 text-xs text-muted-foreground">
              {t("assignmentsTaskGradeDialog.submittedAt", {
                date: formatTashkentDateTime(task.submitted_at, dateLocale()),
              })}
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

        {task.rejection_reason && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <div className="font-medium text-destructive">
              {t("assignmentsTaskGradeDialog.rejectedTitle")}
            </div>
            <div className="mt-1">{task.rejection_reason}</div>
          </div>
        )}

        {task.status === "approved" && (
          <div className="rounded-md border border-success/30 bg-success/5 p-3 text-sm">
            <div className="font-medium">
              {t("assignmentsTaskGradeDialog.approvedTitle")}{" "}
              {task.points_earned !== null && (
                <span className="font-mono">
                  {t("assignmentsTaskGradeDialog.pointsEarned", {
                    earned: task.points_earned,
                    max,
                  })}
                </span>
              )}
            </div>
            {task.graded_by_name && (
              <div className="mt-1 text-xs text-muted-foreground">
                {t("assignmentsTaskGradeDialog.gradedBy", { name: task.graded_by_name })}
                {task.graded_at &&
                  ` · ${formatTashkentDateTime(task.graded_at, dateLocale())}`}
              </div>
            )}
          </div>
        )}

        {/* Baholash — topshiriq yuborilgan, tasdiqlangan yoki rad etilgan bo'lsa */}
        {task.status !== "not_started" && (
          <>
            <Separator />
            <div className="space-y-3">
              <div>
                <Label htmlFor="grade-points">
                  {pointsRequired
                    ? t("assignmentsTaskGradeDialog.pointsLabelRequired", { max })
                    : t("assignmentsTaskGradeDialog.pointsLabelOptional", { max })}
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id="grade-points"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={max}
                    step={1}
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    aria-invalid={showPointsError}
                    aria-describedby="grade-points-hint"
                    className={cn(
                      "w-28 text-right tabular-nums",
                      showPointsError && "border-destructive focus-visible:ring-destructive",
                    )}
                    placeholder="—"
                  />
                  <span className="text-sm tabular-nums text-muted-foreground">/ {max}</span>
                </div>
                <p
                  id="grade-points-hint"
                  className={cn(
                    "mt-1 text-xs",
                    showPointsError ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {showPointsError
                    ? t("assignmentsTaskGradeDialog.pointsRange", { max })
                    : pointsRequired
                      ? t("assignmentsTaskGradeDialog.pointsRequiredHint")
                      : t("assignmentsTaskGradeDialog.pointsOptionalHint")}
                </p>
              </div>

              <div>
                <Label htmlFor="reject-reason">
                  {t("assignmentsTaskGradeDialog.rejectReasonLabel")}
                </Label>
                <textarea
                  id="reject-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  placeholder={t("assignmentsTaskGradeDialog.rejectReasonPlaceholder")}
                />
              </div>
            </div>
          </>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.close")}
          </Button>

          {task.status === "approved" && (
            <Button variant="outline" onClick={handleRevert} disabled={busy}>
              {revert.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4" />
              )}
              {t("assignmentsTaskGradeDialog.revert")}
            </Button>
          )}

          {task.status !== "not_started" && (
            <>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={busy || reason.trim().length < 3}
              >
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
                {parsedPoints !== null && pointsInRange
                  ? t("assignmentsTaskGradeDialog.approveWithPoints", {
                      points: parsedPoints,
                      max,
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
