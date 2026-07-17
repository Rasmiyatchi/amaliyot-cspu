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

  useEffect(() => {
    setContent(task?.submission_md ?? "");
  }, [task]);

  if (!task) return null;

  const handleSubmit = async () => {
    if (content.trim().length < 3) {
      toast.error(t("studentTaskSubmitDialog.tooShort"));
      return;
    }
    try {
      await submit.mutateAsync({
        id: task.id,
        data: { submission_md: content.trim() },
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
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-3">
            <div className="flex-1">
              <div>{task.template_title}</div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs font-normal">
                <TaskCategoryBadge category={task.template_category} />
                <TaskTypeLabel type={task.template_type} />
                {task.template_quantity > 1 && (
                  <Badge variant="outline">{t("studentTaskSubmitDialog.quantity", { n: task.template_quantity })}</Badge>
                )}
                {task.template_month_hint && (
                  <span className="text-muted-foreground">{task.template_month_hint}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <TaskStatusBadge status={task.status} />
              <span className="font-mono text-xs">
                {task.points_earned ?? "—"}/{task.template_points}
              </span>
            </div>
          </DialogTitle>
          {task.template_description && (
            <DialogDescription>{task.template_description}</DialogDescription>
          )}
        </DialogHeader>

        {task.status === "rejected" && task.rejection_reason && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="font-medium">{t("studentTaskSubmitDialog.rejectedTitle")}</div>
              <div className="mt-1 text-sm">{task.rejection_reason}</div>
              <div className="mt-2 text-xs">
                {t("studentTaskSubmitDialog.rejectedHint")}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isApproved && (
          <Alert className="border-success/30 bg-success/5">
            <AlertDescription>
              <div className="font-medium">{t("studentTaskSubmitDialog.approvedTitle")}</div>
              {task.points_earned !== null && (
                <div className="mt-1 text-sm font-mono">
                  {t("studentTaskSubmitDialog.points", {
                    earned: task.points_earned,
                    max: task.template_points,
                  })}
                </div>
              )}
              {task.graded_by_name && (
                <div className="mt-1 text-xs text-muted-foreground">
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
          <Label htmlFor="submission">{t("studentTaskSubmitDialog.submissionLabel")}</Label>
          <textarea
            id="submission"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isApproved}
            rows={12}
            className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm disabled:opacity-60"
            placeholder={t("studentTaskSubmitDialog.submissionPlaceholder")}
          />
          <div className="mt-1 text-xs text-muted-foreground">
            {t("studentTaskSubmitDialog.charCount", { n: content.length })}
            {task.submitted_at &&
              ` · ${t("studentTaskSubmitDialog.lastSubmitted", {
                date: new Date(task.submitted_at).toLocaleString(dateLocale()),
              })}`}
          </div>
        </div>

        <Separator />

        <AttachmentsSection
          kind="task"
          entityId={task.id}
          attachments={(task.attachments ?? []) as never}
          canEdit={!isApproved}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
          {!isApproved && (
            <Button
              onClick={handleSubmit}
              disabled={submit.isPending || content.trim().length < 3}
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
