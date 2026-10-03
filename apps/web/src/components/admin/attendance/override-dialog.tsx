import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";

import { describeRequestError } from "@/components/attendance/request-error";
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
import { Textarea } from "@/components/ui/textarea";
import { useOverrideDay } from "@/lib/api/attendance";
import type { AttendanceDay, AttendanceDayStatus } from "@/lib/api/types";

type Props = {
  day: AttendanceDay | null;
  onClose: () => void;
};

type TargetStatus = Exclude<AttendanceDayStatus, "pending">;

/**
 * O'tgan "kutilmoqda" kun sinxronizatsiyada baribir qizilga aylanadi — maqsad faqat
 * yashil/qizil. Joriy status taklif qilinmaydi (server "Allaqachon ..." deb 409 qaytaradi).
 */
const TARGETS: TargetStatus[] = ["green", "red"];

export function OverrideDialog({ day, onClose }: Props) {
  return (
    <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {/* Har bir kun uchun forma qaytadan yaratiladi — oldingi kunning tanlovi qolmaydi */}
        {day && <OverrideForm key={day.id} day={day} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function OverrideForm({ day, onClose }: { day: AttendanceDay; onClose: () => void }) {
  const { t } = useTranslation();
  const options = TARGETS.filter((s) => s !== day.status);
  const [newStatus, setNewStatus] = useState<TargetStatus>(options[0] ?? "green");
  const [reason, setReason] = useState("");
  const mutation = useOverrideDay();
  const reasonTooShort = reason.trim().length < 3;

  const handleSubmit = async () => {
    if (reasonTooShort) {
      toast.error(t("attendanceOverrideDialog.reasonRequired"));
      return;
    }
    try {
      await mutation.mutateAsync({
        id: day.id,
        data: { new_status: newStatus, reason: reason.trim() },
      });
      toast.success(t("attendanceOverrideDialog.overrideSaved"));
      onClose();
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {t("attendanceOverrideDialog.title")}
        </DialogTitle>
        <DialogDescription>
          {day.student_full_name} · {day.date}
          <br />
          <Trans
            i18nKey="attendanceOverrideDialog.description"
            values={{ status: t(`adminAttendance.status.${day.status}`) }}
            components={[<strong key="0" />]}
          />
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div>
          <Label htmlFor="override-status">{t("attendanceOverrideDialog.newStatus")}</Label>
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TargetStatus)}>
            <SelectTrigger id="override-status" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "green"
                    ? t("attendanceOverrideDialog.statusGreen")
                    : t("attendanceOverrideDialog.statusRed")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="override-reason">
            {t("attendanceOverrideDialog.reason")} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="override-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("attendanceOverrideDialog.reasonPlaceholder")}
            rows={4}
            maxLength={2000}
            className="mt-1"
            aria-invalid={reason.length > 0 && reasonTooShort}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={onClose} disabled={mutation.isPending}>
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={mutation.isPending || reasonTooShort}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("attendanceOverrideDialog.submit")}
        </Button>
      </DialogFooter>
    </>
  );
}
