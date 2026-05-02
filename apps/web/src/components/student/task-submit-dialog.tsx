import { HTTPError } from "ky";
import { Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useSubmitTask } from "@/lib/api/tasks";
import type { Task } from "@/lib/api/types";

type Props = {
  task: Task | null;
  onClose: () => void;
};

export function StudentTaskSubmitDialog({ task, onClose }: Props) {
  const [content, setContent] = useState("");
  const submit = useSubmitTask();

  useEffect(() => {
    setContent(task?.submission_md ?? "");
  }, [task]);

  if (!task) return null;

  const handleSubmit = async () => {
    if (content.trim().length < 3) {
      toast.error("Javob matni juda qisqa");
      return;
    }
    try {
      await submit.mutateAsync({
        id: task.id,
        data: { submission_md: content.trim() },
      });
      toast.success("Yuborildi");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
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
                  <Badge variant="outline">{task.template_quantity} ta</Badge>
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
              <div className="font-medium">Rahbar rad etdi</div>
              <div className="mt-1 text-sm">{task.rejection_reason}</div>
              <div className="mt-2 text-xs">
                Qayta yozib yuboring — status "Yuborilgan"ga qaytadi.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isApproved && (
          <Alert className="border-success/30 bg-success/5">
            <AlertDescription>
              <div className="font-medium">Tasdiqlangan</div>
              {task.points_earned !== null && (
                <div className="mt-1 text-sm font-mono">
                  Ball: {task.points_earned}/{task.template_points}
                </div>
              )}
              {task.graded_by_name && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Baholagan: {task.graded_by_name}
                  {task.graded_at &&
                    ` · ${new Date(task.graded_at).toLocaleString("uz-UZ")}`}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <div>
          <Label htmlFor="submission">Javob matni (markdown)</Label>
          <textarea
            id="submission"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isApproved}
            rows={12}
            className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm disabled:opacity-60"
            placeholder="Bajarilgan ishni batafsil yozing..."
          />
          <div className="mt-1 text-xs text-muted-foreground">
            {content.length} ta belgi
            {task.submitted_at &&
              ` · Oxirgi yuborilgan: ${new Date(task.submitted_at).toLocaleString("uz-UZ")}`}
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
            Yopish
          </Button>
          {!isApproved && (
            <Button
              onClick={handleSubmit}
              disabled={submit.isPending || content.trim().length < 3}
            >
              {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              Yuborish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
