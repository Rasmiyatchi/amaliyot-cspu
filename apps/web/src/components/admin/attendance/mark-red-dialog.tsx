import { HTTPError } from "ky";
import { Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { useMarkRed } from "@/lib/api/attendance";
import type { PracticeAssignment } from "@/lib/api/types";

type Props = {
  assignment: PracticeAssignment | null;
  onClose: () => void;
};

export function MarkRedDialog({ assignment, onClose }: Props) {
  const { t } = useTranslation();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const mutation = useMarkRed();

  const handleSubmit = async () => {
    if (!assignment || !date) {
      toast.error(t("attendanceMarkRedDialog.errors.dateRequired"));
      return;
    }
    try {
      await mutation.mutateAsync({
        assignmentId: assignment.id,
        data: { date, note: note || null },
      });
      toast.success(t("attendanceMarkRedDialog.toasts.marked", { date }));
      setDate("");
      setNote("");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  return (
    <Dialog open={!!assignment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            {t("attendanceMarkRedDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {assignment?.student_full_name} · {assignment?.organization_name ?? assignment?.area_name}
            <br />
            {t("attendanceMarkRedDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="mark-red-date">{t("common.date")}</Label>
            <Input
              id="mark-red-date"
              type="date"
              value={date}
              min={assignment?.start_date}
              max={assignment?.end_date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="mark-red-note">{t("attendanceMarkRedDialog.noteLabel")}</Label>
            <textarea
              id="mark-red-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("attendanceMarkRedDialog.notePlaceholder")}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={mutation.isPending || !date}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("attendanceMarkRedDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
