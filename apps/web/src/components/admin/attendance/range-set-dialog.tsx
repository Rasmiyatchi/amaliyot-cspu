import { CalendarRange, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  clampDateStr,
  previewRange,
  type RangePreview,
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
import { Textarea } from "@/components/ui/textarea";
import { useBulkSetAttendanceRange, useSetAttendanceRange } from "@/lib/api/attendance";
import type {
  AttendanceDay,
  AttendanceRangeSetMode,
  AttendanceRangeSetRequest,
  ISODate,
  UUID,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

export type RangeSetAssignment = {
  assignment_id: UUID;
  label: string;
  start_date: ISODate;
  end_date: ISODate;
  required_weekdays: number[] | null;
};

export type RangeSetTarget =
  | {
      kind: "single";
      assignment: RangeSetAssignment;
      /** Mavjud yozuvlar — aniq preview (yaratiladi/yangilanadi/o'tkaziladi) uchun */
      daysByDate?: ReadonlyMap<ISODate, AttendanceDay>;
    }
  | { kind: "multi"; assignments: RangeSetAssignment[] };

export type RangeSetPreset = {
  date_from?: ISODate;
  date_to?: ISODate;
  status?: "green" | "red";
};

type Props = {
  target: RangeSetTarget | null;
  preset?: RangeSetPreset;
  onClose: () => void;
  onDone?: () => void;
};

export function RangeSetDialog({ target, preset, onClose, onDone }: Props) {
  const formKey =
    target === null
      ? "none"
      : target.kind === "single"
        ? `single:${target.assignment.assignment_id}:${preset?.date_from ?? ""}:${preset?.date_to ?? ""}:${preset?.status ?? ""}`
        : `multi:${target.assignments.map((a) => a.assignment_id).join(",")}`;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {target && (
          <RangeSetForm
            key={formKey}
            target={target}
            preset={preset}
            onClose={onClose}
            onDone={onDone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RangeSetForm({
  target,
  preset,
  onClose,
  onDone,
}: {
  target: RangeSetTarget;
  preset?: RangeSetPreset;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { t } = useTranslation();
  const assignments = useMemo(
    () => (target.kind === "single" ? [target.assignment] : target.assignments),
    [target],
  );

  // Umumiy chegara: eng erta boshlanish — eng kech tugash
  const bounds = useMemo(() => {
    let min = assignments[0]?.start_date ?? "";
    let max = assignments[0]?.end_date ?? "";
    for (const a of assignments) {
      if (a.start_date < min) min = a.start_date;
      if (a.end_date > max) max = a.end_date;
    }
    return { min, max };
  }, [assignments]);

  const [dateFrom, setDateFrom] = useState<ISODate>(
    preset?.date_from ? clampDateStr(preset.date_from, bounds.min, bounds.max) : bounds.min,
  );
  const [dateTo, setDateTo] = useState<ISODate>(
    preset?.date_to ? clampDateStr(preset.date_to, bounds.min, bounds.max) : bounds.max,
  );
  const [status, setStatus] = useState<"green" | "red">(preset?.status ?? "green");
  const [mode, setMode] = useState<AttendanceRangeSetMode>("fill");
  const [onlyRequired, setOnlyRequired] = useState(true);
  const [reason, setReason] = useState("");

  const single = useSetAttendanceRange();
  const bulk = useBulkSetAttendanceRange();
  const isPending = single.isPending || bulk.isPending;

  const preview = useMemo<RangePreview & { perAssignment: number }>(() => {
    let acc: RangePreview = { from: null, to: null, candidates: 0, create: 0, update: 0, skip: 0 };
    let touched = 0;
    for (const a of assignments) {
      const p = previewRange({
        dateFrom,
        dateTo,
        rangeStart: a.start_date,
        rangeEnd: a.end_date,
        requiredWeekdays: a.required_weekdays,
        onlyRequiredWeekdays: onlyRequired,
        mode,
        status,
        daysByDate: target.kind === "single" ? target.daysByDate : undefined,
      });
      if (p.candidates > 0) touched += 1;
      acc = {
        from: acc.from === null || (p.from !== null && p.from < acc.from) ? p.from : acc.from,
        to: acc.to === null || (p.to !== null && p.to > acc.to) ? p.to : acc.to,
        candidates: acc.candidates + p.candidates,
        create: acc.create + p.create,
        update: acc.update + p.update,
        skip: acc.skip + p.skip,
      };
    }
    return { ...acc, perAssignment: touched };
  }, [assignments, dateFrom, dateTo, onlyRequired, mode, status, target]);

  const hasDetail = target.kind === "single" && !!target.daysByDate;
  const invalidRange = !dateFrom || !dateTo || dateFrom > dateTo;
  const reasonTooShort = reason.trim().length < 3;
  const nothingToDo =
    preview.candidates === 0 || (hasDetail && preview.create + preview.update === 0);

  const handleSubmit = async () => {
    if (invalidRange) {
      toast.error(t("attendanceRange.invalidRange"));
      return;
    }
    if (reasonTooShort) {
      toast.error(t("attendanceDayEdit.reasonRequired"));
      return;
    }
    const body: AttendanceRangeSetRequest = {
      date_from: dateFrom,
      date_to: dateTo,
      status,
      reason: reason.trim(),
      only_required_weekdays: onlyRequired,
      mode,
    };
    try {
      if (target.kind === "single") {
        const res = await single.mutateAsync({
          assignmentId: target.assignment.assignment_id,
          data: body,
        });
        toast.success(
          t("attendanceRange.resultToast", {
            created: res.created,
            updated: res.updated,
            skipped: res.skipped,
          }),
        );
      } else {
        const res = await bulk.mutateAsync({
          ...body,
          assignment_ids: target.assignments.map((a) => a.assignment_id),
        });
        toast.success(
          t("attendanceRange.bulkResultToast", {
            assignments: res.assignments,
            created: res.created,
            updated: res.updated,
            skipped: res.skipped,
          }),
        );
        if (res.failed.length > 0) {
          toast.warning(
            t("attendanceRange.bulkFailedToast", {
              count: res.failed.length,
              first: res.failed[0]?.error ?? "",
            }),
          );
        }
      }
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          {t("attendanceRange.title")}
        </DialogTitle>
        <DialogDescription>
          {target.kind === "single"
            ? target.assignment.label
            : t("attendanceRange.multiDescription", {
                count: target.assignments.length,
              })}
          {" · "}
          <span className="font-mono">
            {bounds.min} — {bounds.max}
          </span>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="range-from">{t("adminAttendance.dateFrom")}</Label>
            <Input
              id="range-from"
              type="date"
              value={dateFrom}
              min={bounds.min}
              max={bounds.max}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="range-to">{t("adminAttendance.dateTo")}</Label>
            <Input
              id="range-to"
              type="date"
              value={dateTo}
              min={dateFrom || bounds.min}
              max={bounds.max}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1"
              aria-invalid={invalidRange}
            />
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-medium">{t("common.status")}</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <ChoiceCard
              name="range-status"
              checked={status === "green"}
              onSelect={() => setStatus("green")}
              title={t("adminAttendance.status.green")}
              className="data-[checked=true]:border-emerald-500 data-[checked=true]:bg-emerald-500/10"
              dot="bg-emerald-500"
            />
            <ChoiceCard
              name="range-status"
              checked={status === "red"}
              onSelect={() => setStatus("red")}
              title={t("adminAttendance.status.red")}
              className="data-[checked=true]:border-rose-500 data-[checked=true]:bg-rose-500/10"
              dot="bg-rose-500"
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">{t("attendanceRange.mode")}</legend>
          <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ChoiceCard
              name="range-mode"
              checked={mode === "fill"}
              onSelect={() => setMode("fill")}
              title={t("attendanceRange.modeFill")}
              description={t("attendanceRange.modeFillHint")}
            />
            <ChoiceCard
              name="range-mode"
              checked={mode === "overwrite"}
              onSelect={() => setMode("overwrite")}
              title={t("attendanceRange.modeOverwrite")}
              description={t("attendanceRange.modeOverwriteHint")}
            />
          </div>
        </fieldset>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyRequired}
            onChange={(e) => setOnlyRequired(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
          />
          <span>
            {t("attendanceRange.onlyRequired")}
            <span className="block text-xs text-muted-foreground">
              {t("attendanceRange.onlyRequiredHint")}
            </span>
          </span>
        </label>

        <Alert variant={nothingToDo ? "warning" : status === "green" ? "success" : "destructive"}>
          <AlertDescription>
            {invalidRange
              ? t("attendanceRange.invalidRange")
              : preview.candidates === 0
                ? t("attendanceRange.previewNone")
                : hasDetail
                  ? t("attendanceRange.previewDetail", {
                      from: preview.from,
                      to: preview.to,
                      create: preview.create,
                      update: preview.update,
                      skip: preview.skip,
                    })
                  : t("attendanceRange.previewApprox", {
                      from: preview.from,
                      to: preview.to,
                      count: preview.candidates,
                      assignments: preview.perAssignment,
                    })}
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="range-reason">
            {t("attendanceDayEdit.reason")} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="range-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={2000}
            className="mt-1"
            placeholder={t("attendanceRange.reasonPlaceholder")}
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
          variant={status === "green" ? "default" : "destructive"}
          onClick={handleSubmit}
          disabled={isPending || invalidRange || reasonTooShort || nothingToDo}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("attendanceRange.submit")}
        </Button>
      </DialogFooter>
    </>
  );
}

function ChoiceCard({
  name,
  checked,
  onSelect,
  title,
  description,
  dot,
  className,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  dot?: string;
  className?: string;
}) {
  return (
    <label
      data-checked={checked}
      className={cn(
        "flex cursor-pointer items-start gap-2 rounded-md border border-input p-2.5 text-sm transition-colors hover:bg-accent/50",
        "data-[checked=true]:border-primary data-[checked=true]:bg-primary/5",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 h-4 w-4 accent-primary"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-medium">
          {dot && <span className={cn("h-2 w-2 rounded-full", dot)} />}
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        )}
      </span>
    </label>
  );
}
