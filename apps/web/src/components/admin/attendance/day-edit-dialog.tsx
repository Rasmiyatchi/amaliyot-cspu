import { CalendarClock, Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import {
  fromDatetimeLocal,
  toDatetimeLocal,
  todayStr,
} from "@/components/attendance/attendance-date-utils";
import { describeRequestError } from "@/components/attendance/request-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSetAttendanceDay, useUpdateAttendanceDay } from "@/lib/api/attendance";
import type {
  AttendanceDay,
  AttendanceDayDetail,
  AttendanceDaySetRequest,
  AttendanceDayStatus,
  ISODate,
  UUID,
} from "@/lib/api/types";

/**
 * Nimani tahrirlaymiz:
 *  - "date": biriktirish + sana (A3 PUT upsert; yozuv bo'lmasa yaratiladi, kelajak sana = oldindan tasdiq)
 *  - "day":  mavjud yozuv id bo'yicha (A4 PATCH)
 */
export type DayEditTarget =
  | {
      kind: "date";
      assignmentId: UUID;
      date: ISODate;
      existing: AttendanceDay | null;
      studentName: string | null;
    }
  | { kind: "day"; day: AttendanceDay };

type Props = {
  target: DayEditTarget | null;
  onClose: () => void;
  onSaved?: (detail: AttendanceDayDetail) => void;
};

const STATUSES: AttendanceDayStatus[] = ["green", "red", "pending"];

export function DayEditDialog({ target, onClose, onSaved }: Props) {
  const formKey =
    target === null
      ? "none"
      : target.kind === "day"
        ? `day:${target.day.id}`
        : `date:${target.assignmentId}:${target.date}`;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {target && (
          <DayEditForm key={formKey} target={target} onClose={onClose} onSaved={onSaved} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DayEditForm({
  target,
  onClose,
  onSaved,
}: {
  target: DayEditTarget;
  onClose: () => void;
  onSaved?: (detail: AttendanceDayDetail) => void;
}) {
  const { t } = useTranslation();
  const existing: AttendanceDay | null = target.kind === "day" ? target.day : target.existing;
  const date = target.kind === "day" ? target.day.date : target.date;
  const studentName = target.kind === "day" ? target.day.student_full_name : target.studentName;
  const isFuture = date > todayStr();
  const isNew = existing === null;

  const initialStatus: AttendanceDayStatus = existing?.status ?? "green";
  const initialIn = toDatetimeLocal(existing?.check_in_at);
  const initialOut = toDatetimeLocal(existing?.check_out_at);
  const initialNote = existing?.note ?? "";

  const [status, setStatus] = useState<AttendanceDayStatus>(initialStatus);
  const [checkIn, setCheckIn] = useState(initialIn);
  const [checkOut, setCheckOut] = useState(initialOut);
  const [note, setNote] = useState(initialNote);
  const [reason, setReason] = useState("");

  const setByDate = useSetAttendanceDay();
  const updateById = useUpdateAttendanceDay();
  const isPending = setByDate.isPending || updateById.isPending;

  const inIso = fromDatetimeLocal(checkIn);
  const outIso = fromDatetimeLocal(checkOut);
  const timesInvalid = !!inIso && !!outIso && outIso < inIso;
  const reasonTooShort = reason.trim().length < 3;

  const nothingChanged =
    !isNew &&
    status === initialStatus &&
    checkIn === initialIn &&
    checkOut === initialOut &&
    note.trim() === initialNote.trim();

  const buildBody = (): AttendanceDaySetRequest => {
    const body: AttendanceDaySetRequest = { status, reason: reason.trim() };
    if (checkIn !== initialIn) body.check_in_at = inIso;
    if (checkOut !== initialOut) body.check_out_at = outIso;
    if (note.trim() !== initialNote.trim()) body.note = note.trim() || null;
    return body;
  };

  const handleSubmit = async () => {
    if (reasonTooShort) {
      toast.error(t("attendanceDayEdit.reasonRequired"));
      return;
    }
    if (timesInvalid) {
      toast.error(t("attendanceDayEdit.timesInvalid"));
      return;
    }
    try {
      const body = buildBody();
      const detail =
        target.kind === "day"
          ? await updateById.mutateAsync({ id: target.day.id, data: body })
          : await setByDate.mutateAsync({
              assignmentId: target.assignmentId,
              day: target.date,
              data: body,
            });
      toast.success(
        t("attendanceDayEdit.saved", { date, status: t(`adminAttendance.status.${status}`) }),
      );
      onSaved?.(detail);
      onClose();
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Pencil className="h-5 w-5 text-primary" />
          {isNew ? t("attendanceDayEdit.titleNew") : t("attendanceDayEdit.titleEdit")}
        </DialogTitle>
        <DialogDescription asChild>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{studentName ?? "—"}</span>
            <span>·</span>
            <span className="font-mono">{date}</span>
            {existing && <AttendanceStatusBadge status={existing.status} />}
            {isNew && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {t("attendanceDayEdit.noRecordYet")}
              </span>
            )}
          </div>
        </DialogDescription>
      </DialogHeader>

      {isFuture && (
        <Alert variant="info">
          <CalendarClock className="h-4 w-4" />
          <AlertDescription>{t("attendanceDayEdit.futureHint")}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div>
          <Label htmlFor="day-edit-status">{t("common.status")}</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as AttendanceDayStatus)}>
            <SelectTrigger id="day-edit-status" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`adminAttendance.status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="day-edit-in">{t("attendanceDayDetailDialog.checkInTime")}</Label>
            <Input
              id="day-edit-in"
              type="datetime-local"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="day-edit-out">{t("attendanceDayDetailDialog.checkOutTime")}</Label>
            <Input
              id="day-edit-out"
              type="datetime-local"
              value={checkOut}
              min={checkIn || undefined}
              onChange={(e) => setCheckOut(e.target.value)}
              className="mt-1"
              aria-invalid={timesInvalid}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("attendanceDayEdit.timesHint")} {t("attendanceDayEdit.timesTimezone")}
        </p>
        {timesInvalid && (
          <p className="text-xs text-destructive" role="alert">
            {t("attendanceDayEdit.timesInvalid")}
          </p>
        )}

        <div>
          <Label htmlFor="day-edit-note">{t("common.note")}</Label>
          <Textarea
            id="day-edit-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-1"
            placeholder={t("attendanceDayEdit.notePlaceholder")}
          />
        </div>

        <div>
          <Label htmlFor="day-edit-reason">
            {t("attendanceDayEdit.reason")} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="day-edit-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={2000}
            className="mt-1"
            placeholder={t("attendanceOverrideDialog.reasonPlaceholder")}
            aria-invalid={reason.length > 0 && reasonTooShort}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" type="button" onClick={onClose} disabled={isPending}>
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || reasonTooShort || timesInvalid || nothingChanged}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("common.save")}
        </Button>
      </DialogFooter>
    </>
  );
}
