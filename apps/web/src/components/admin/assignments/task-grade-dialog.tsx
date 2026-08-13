import { HTTPError } from "ky";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
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
import { dateLocale } from "@/i18n";
import { useApproveTask, useRejectTask } from "@/lib/api/tasks";
import type { Task } from "@/lib/api/types";

type Props = {
  task: Task | null;
  onClose: () => void;
};

export function TaskGradeDialog({ task, onClose }: Props) {
  const { t } = useTranslation();
  const [points, setPoints] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const approve = useApproveTask();
  const reject = useRejectTask();

  const busy = approve.isPending || reject.isPending;

  if (!task) return null;

  const handleApprove = async () => {
    const parsed = points === "" ? null : Number(points);
    if (parsed !== null) {
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > task.template_points) {
        toast.error(t("assignmentsTaskGradeDialog.pointsRange", { max: task.template_points }));
        return;
      }
    }
    try {
      await approve.mutateAsync({
        id: task.id,
        data: { points_earned: parsed },
      });
      toast.success(t("assignmentsTaskGradeDialog.approvedToast"));
      setPoints("");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
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
      toast.success(t("assignmentsTaskGradeDialog.rejectedToast"));
      setReason("");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.template_title}</DialogTitle>
          <DialogDescription>
            {t("common.courseN", { n: task.template_course })} ·{" "}
            {task.template_semester === "fall"
              ? t("common.semesterFall")
              : t("common.semesterSpring")}
            {" · "}
            {t("assignmentsTaskGradeDialog.maxPoints", { points: task.template_points })}
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
            <div className="whitespace-pre-wrap rounded-md border border-border p-3 text-sm">
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
                date: new Date(task.submitted_at).toLocaleString(dateLocale()),
              })}
            </div>
          )}

          <div className="mt-4">
            <AttachmentsSection
              kind="task"
              entityId={task.id}
              attachments={(task.attachments ?? []) as never}
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
                    max: task.template_points,
                  })}
                </span>
              )}
            </div>
            {task.graded_by_name && (
              <div className="mt-1 text-xs text-muted-foreground">
                {t("assignmentsTaskGradeDialog.gradedBy", { name: task.graded_by_name })}
                {task.graded_at &&
                  ` · ${new Date(task.graded_at).toLocaleString(dateLocale())}`}
              </div>
            )}
          </div>
        )}

        {/* Grading — agar submit qilingan yoki approved/rejected bo'lsa */}
        {task.status !== "not_started" && (
          <>
            <Separator />
            <div className="space-y-3">
              <div>
                <Label htmlFor="grade-points">
                  {t("assignmentsTaskGradeDialog.pointsLabel", { max: task.template_points })}
                </Label>
                <Input
                  id="grade-points"
                  type="number"
                  min={0}
                  max={task.template_points}
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder={String(task.points_earned ?? "")}
                />
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

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
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
                {t("common.reject")}
              </Button>
              <Button onClick={handleApprove} disabled={busy}>
                {approve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle2 className="h-4 w-4" />
                {t("common.approve")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
