import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { describeRequestError } from "@/components/attendance/request-error";
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

export function BulkOverrideDialog({ open, onClose, selectedIds, targetStatus, onSuccess }: Props) {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const bulkUpdate = useBulkAttendanceUpdate();

  // Yopilganda forma tozalanadi (effect o'rniga — exhaustive-deps ogohlantirishisiz)
  const handleClose = () => {
    setNote("");
    bulkUpdate.reset();
    onClose();
  };

  if (!targetStatus) return null;

  const isGreen = targetStatus === "green";

  const handleSubmit = async () => {
    if (!isGreen && !note.trim()) {
      toast.error(t("attendanceDayDetailDialog.reasonRequired"));
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
          ? t("adminAttendance.bulkGreenSuccess", { count: res.updated_count })
          : t("adminAttendance.bulkRedSuccess", { count: res.updated_count }),
      );
      onSuccess();
      handleClose();
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
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
                ? t("adminAttendance.bulkApproveTitle")
                : t("adminAttendance.bulkRejectTitle")}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t("adminAttendance.bulkDesc", { count: selectedIds.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Alert variant={isGreen ? "success" : "destructive"}>
            <AlertTitle className="text-sm font-medium">
              {isGreen
                ? t("adminAttendance.bulkGreenAlert", { count: selectedIds.length })
                : t("adminAttendance.bulkRedAlert", { count: selectedIds.length })}
            </AlertTitle>
          </Alert>

          <div>
            <Label htmlFor="bulk-note">
              {t("common.note")} {!isGreen && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="bulk-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder={
                isGreen
                  ? t("adminAttendance.bulkNotePlaceholderGreen")
                  : t("adminAttendance.bulkNotePlaceholderRed")
              }
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={handleClose}
            disabled={bulkUpdate.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant={isGreen ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={bulkUpdate.isPending}
          >
            {bulkUpdate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGreen ? t("adminAttendance.confirmApprove") : t("adminAttendance.confirmReject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
