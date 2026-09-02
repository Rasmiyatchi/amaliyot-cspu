import { HTTPError } from "ky";
import { Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  TaskStatusBadge,
} from "@/components/admin/tasks/task-status-badge";
import {
  TaskCategoryBadge,
  TaskTypeLabel,
} from "@/components/admin/tasks/task-type-badge";
import { AttachmentsSection } from "@/components/attachments-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { dateLocale } from "@/i18n";
import { useSubmitTask } from "@/lib/api/tasks";
import type { Task } from "@/lib/api/types";

type Props = {
  task: Task | null;
  onClose: () => void;
};

export function StudentTaskSubmitDialog({ task, onClose }: Props) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const submit = useSubmitTask();

  // Faqat task almashganda reset — submission_md ni deps'ga qo'shsak, har saqlashda
  // foydalanuvchi yozayotgan matn qayta yozilib ketadi
  useEffect(() => {
    setContent(task?.submission_md ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  if (!task) return null;

  const handleSubmit = async () => {
    if (content.trim().length < 3) {
      toast.error(t("studentTaskSubmitDialog.tooShort"));
      return;
    }
    try {
      await submit.mutateAsync({
        id: task.id,
        data: { 
          submission_md: content.trim(),
          attachments: task.attachments ?? [],
        },
      });
      toast.success(t("studentTaskSubmitDialog.submitted"));
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const isApproved = task.status === "approved";

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88dvh] sm:max-w-2xl overflow-y-auto">
        <DialogHeader className="pr-6 sm:pr-0 text-left">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
            <div className="flex-1 min-w-0 pr-1 sm:pr-0">
              <div className="break-words font-semibold text-base sm:text-lg leading-snug">{task.template_title}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-normal">
                <TaskCategoryBadge category={task.template_category} />
                <TaskTypeLabel type={task.template_type} />
                {task.template_quantity > 1 && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {t("studentTaskSubmitDialog.quantity", { n: task.template_quantity })}
                  </Badge>
                )}
                {task.template_month_hint && (
                  <span className="text-muted-foreground text-xs">{task.template_month_hint}</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1.5 shrink-0 pt-1.5 sm:pt-0 border-t border-border/40 sm:border-0">
              <TaskStatusBadge status={task.status} />
              <span className="font-mono text-xs text-muted-foreground sm:text-foreground">
                {task.points_earned ?? "—"}/{task.template_points}
              </span>
            </div>
          </DialogTitle>
          {task.template_description && (
            <DialogDescription className="mt-2 text-xs sm:text-sm break-words">{task.template_description}</DialogDescription>
          )}
        </DialogHeader>

        {task.status === "rejected" && task.rejection_reason && (
          <Alert variant="destructive" className="py-2.5 px-3">
            <AlertDescription>
              <div className="font-medium text-xs sm:text-sm">{t("studentTaskSubmitDialog.rejectedTitle")}</div>
              <div className="mt-1 text-xs sm:text-sm break-words">{task.rejection_reason}</div>
              <div className="mt-1.5 text-[11px] sm:text-xs opacity-90">
                {t("studentTaskSubmitDialog.rejectedHint")}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isApproved && (
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
              {task.graded_by_name && (
                <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground">
                  {t("studentTaskSubmitDialog.gradedBy", { name: task.graded_by_name })}
                  {task.graded_at &&
                    ` · ${new Date(task.graded_at).toLocaleString(dateLocale())}`}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <div>
          <Label htmlFor="submission" className="text-xs sm:text-sm font-medium">{t("studentTaskSubmitDialog.submissionLabel")}</Label>
          <textarea
            id="submission"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isApproved}
            rows={5}
            className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs sm:text-sm disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={t("studentTaskSubmitDialog.submissionPlaceholder")}
          />
          <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground flex flex-wrap gap-1">
            <span>{t("studentTaskSubmitDialog.charCount", { n: content.length })}</span>
            {task.submitted_at && (
              <span>
                · {t("studentTaskSubmitDialog.lastSubmitted", {
                  date: new Date(task.submitted_at).toLocaleString(dateLocale()),
                })}
              </span>
            )}
          </div>
        </div>

        <Separator />

        <AttachmentsSection
          kind="task"
          entityId={task.id}
          attachments={(task.attachments ?? []) as never}
          canEdit={!isApproved}
        />

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            {t("common.close")}
          </Button>
          {!isApproved && (
            <Button
              onClick={handleSubmit}
              disabled={submit.isPending || content.trim().length < 3}
              className="w-full sm:w-auto"
            >
              {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              {t("studentTaskSubmitDialog.submitButton")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
