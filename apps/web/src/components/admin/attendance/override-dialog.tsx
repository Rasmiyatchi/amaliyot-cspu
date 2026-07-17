import { HTTPError } from "ky";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOverrideDay } from "@/lib/api/attendance";
import type { AttendanceDay, AttendanceDayStatus } from "@/lib/api/types";

type Props = {
  day: AttendanceDay | null;
  onClose: () => void;
};

export function OverrideDialog({ day, onClose }: Props) {
  const { t } = useTranslation();
  const [newStatus, setNewStatus] = useState<AttendanceDayStatus>("green");
  const [reason, setReason] = useState("");
  const mutation = useOverrideDay();

  const handleSubmit = async () => {
    if (!day) return;
    if (reason.trim().length < 3) {
      toast.error(t("attendanceOverrideDialog.reasonRequired"));
      return;
    }
    try {
      await mutation.mutateAsync({
        id: day.id,
        data: { new_status: newStatus, reason: reason.trim() },
      });
      toast.success(t("attendanceOverrideDialog.overrideSaved"));
      setReason("");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  return (
    <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("attendanceOverrideDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {day?.student_full_name} · {day?.date}
            <br />
            <Trans
              i18nKey="attendanceOverrideDialog.description"
              values={{ status: day?.status }}
              components={[<strong key="0" />]}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="override-status">{t("attendanceOverrideDialog.newStatus")}</Label>
            <Select
              value={newStatus}
              onValueChange={(v) => setNewStatus(v as AttendanceDayStatus)}
            >
              <SelectTrigger id="override-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="green">{t("attendanceOverrideDialog.statusGreen")}</SelectItem>
                <SelectItem value="red">{t("attendanceOverrideDialog.statusRed")}</SelectItem>
                <SelectItem value="pending">
                  {t("attendanceOverrideDialog.statusPending")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="override-reason">
              {t("attendanceOverrideDialog.reason")} <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("attendanceOverrideDialog.reasonPlaceholder")}
              rows={4}
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || reason.trim().length < 3}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("attendanceOverrideDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
