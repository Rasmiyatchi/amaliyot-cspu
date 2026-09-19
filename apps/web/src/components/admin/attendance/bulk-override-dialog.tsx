import { HTTPError } from "ky";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertTitle } from "@/components/ui/alert";
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
import { useBulkAttendanceUpdate } from "@/lib/api/attendance";
import type { AttendanceDayStatus } from "@/lib/api/types";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  targetStatus: AttendanceDayStatus | null;
  onSuccess: () => void;
};

export function BulkOverrideDialog({
  open,
  onClose,
  selectedIds,
  targetStatus,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const bulkUpdate = useBulkAttendanceUpdate();

  useEffect(() => {
    if (!open) {
      setNote("");
      bulkUpdate.reset();
    }
  }, [open]);

  if (!targetStatus) return null;

  const isGreen = targetStatus === "green";

  const handleSubmit = async () => {
    if (!isGreen && !note.trim()) {
      toast.error(t("attendanceDayDetailDialog.reasonRequired", { defaultValue: "Rad etish sababini kiriting" }));
      return;
    }

    try {
      const res = await bulkUpdate.mutateAsync({
        day_ids: selectedIds,
        status: targetStatus,
        note: note.trim() || undefined,
      });

      toast.success(
        isGreen
          ? t("adminAttendance.bulkGreenSuccess", {
              defaultValue: "{{count}} ta davomat yozuvi tasdiqlandi (yashil)",
              count: res.updated_count,
            })
          : t("adminAttendance.bulkRedSuccess", {
              defaultValue: "{{count}} ta davomat yozuvi rad etildi (qizil)",
              count: res.updated_count,
            }),
      );
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(
        e instanceof HTTPError
          ? e.message
          : t("common.error", { defaultValue: "Xatolik yuz berdi" }),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isGreen ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            )}
            <DialogTitle>
              {isGreen
                ? t("adminAttendance.bulkApproveTitle", {
                    defaultValue: "Ommaviy tasdiqlash (Yashil)",
                  })
                : t("adminAttendance.bulkRejectTitle", {
                    defaultValue: "Ommaviy rad etish (Qizil)",
                  })}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t("adminAttendance.bulkDesc", {
              count: selectedIds.length,
              defaultValue: "Tanlangan {{count}} ta yozuv o'zgartiriladi.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Alert variant={isGreen ? "success" : "destructive"}>
            <AlertTitle className="text-sm font-medium">
              {isGreen
                ? t("adminAttendance.bulkGreenAlert", {
                    defaultValue: "Barcha {{count}} ta yozuv 'Kelgan / Tasdiqlangan' holatiga o'tadi.",
                    count: selectedIds.length,
                  })
                : t("adminAttendance.bulkRedAlert", {
                    defaultValue: "Barcha {{count}} ta yozuv 'Rad etilgan / Qizil' holatiga o'tadi.",
                    count: selectedIds.length,
                  })}
            </AlertTitle>
          </Alert>

          <div>
            <Label htmlFor="bulk-note">
              {t("common.note", { defaultValue: "Izoh / Sabab" })}{" "}
              {!isGreen && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="bulk-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isGreen
                  ? t("adminAttendance.bulkNotePlaceholderGreen", {
                      defaultValue: "Ixtiyoriy izoh kiriting...",
                    })
                  : t("adminAttendance.bulkNotePlaceholderRed", {
                      defaultValue: "Rad etish sababini yozing...",
                    })
              }
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={bulkUpdate.isPending}>
            {t("common.cancel", { defaultValue: "Bekor qilish" })}
          </Button>
          <Button
            type="button"
            variant={isGreen ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={bulkUpdate.isPending}
          >
            {bulkUpdate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGreen
              ? t("adminAttendance.confirmApprove", { defaultValue: "Tasdiqlash" })
              : t("adminAttendance.confirmReject", { defaultValue: "Rad etish" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
