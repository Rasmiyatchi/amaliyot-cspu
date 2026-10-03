import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Loader2,
  Pencil,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { DayDetailDialog } from "@/components/admin/attendance/day-detail-dialog";
import { DayEditDialog, type DayEditTarget } from "@/components/admin/attendance/day-edit-dialog";
import {
  RangeSetDialog,
  type RangeSetPreset,
  type RangeSetTarget,
} from "@/components/admin/attendance/range-set-dialog";
import {
  DEFAULT_REQUIRED_WEEKDAYS,
  clampDateStr,
  compareMonth,
  monthEndStr,
  monthOf,
  monthStartStr,
  todayStr,
} from "@/components/attendance/attendance-date-utils";
import { AttendanceMonthGrid } from "@/components/attendance/attendance-month-grid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { dateLocale } from "@/i18n";
import { useAttendanceDays } from "@/lib/api/attendance";
import type { AttendanceDay, AttendanceSummaryRow, ISODate } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

type Props = {
  row: AttendanceSummaryRow | null;
  onClose: () => void;
  /** "Kunlar" tabida shu biriktirish bo'yicha ro'yxatni ochish */
  onOpenInDaysList?: (row: AttendanceSummaryRow) => void;
};

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const WEEKDAY_DEFAULTS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export function StudentAttendanceDialog({ row, onClose, onOpenInDaysList }: Props) {
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-3 sm:p-6">
        {row && (
          <StudentAttendanceBody
            key={row.assignment_id}
            row={row}
            onOpenInDaysList={onOpenInDaysList}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function percentTone(p: number | null): string {
  if (p === null) return "[&>div]:bg-muted-foreground/40";
  if (p >= 80) return "[&>div]:bg-emerald-500";
  if (p >= 60) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-rose-500";
}

function fmtTime(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" });
}

function StudentAttendanceBody({
  row,
  onOpenInDaysList,
}: {
  row: AttendanceSummaryRow;
  onOpenInDaysList?: (row: AttendanceSummaryRow) => void;
}) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === "super_admin";
  const today = todayStr();

  const { data, isPending, error } = useAttendanceDays(
    { assignment_id: row.assignment_id },
    1,
    500,
  );
  const days = useMemo(() => data?.items ?? [], [data]);

  const daysByDate = useMemo(() => {
    const m = new Map<ISODate, AttendanceDay>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  const startMonth = useMemo(() => monthOf(row.start_date), [row.start_date]);
  const endMonth = useMemo(() => monthOf(row.end_date), [row.end_date]);
  const [view, setView] = useState(() =>
    monthOf(clampDateStr(today, row.start_date, row.end_date)),
  );
  const canPrev = compareMonth(view, startMonth) > 0;
  const canNext = compareMonth(view, endMonth) < 0;
  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(dateLocale(), {
    month: "long",
    year: "numeric",
  });
  const visibleFrom = clampDateStr(
    monthStartStr(view.year, view.month),
    row.start_date,
    row.end_date,
  );
  const visibleTo = clampDateStr(monthEndStr(view.year, view.month), row.start_date, row.end_date);

  const monthDays = useMemo(() => {
    const from = monthStartStr(view.year, view.month);
    const to = monthEndStr(view.year, view.month);
    return days
      .filter((d) => d.date >= from && d.date <= to)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [days, view]);

  const [detailDay, setDetailDay] = useState<AttendanceDay | null>(null);
  const [editTarget, setEditTarget] = useState<DayEditTarget | null>(null);
  const [rangeTarget, setRangeTarget] = useState<RangeSetTarget | null>(null);
  const [rangePreset, setRangePreset] = useState<RangeSetPreset | undefined>(undefined);

  const required =
    row.required_weekdays && row.required_weekdays.length > 0
      ? row.required_weekdays
      : DEFAULT_REQUIRED_WEEKDAYS;

  const openRange = (preset: RangeSetPreset) => {
    setRangePreset(preset);
    setRangeTarget({
      kind: "single",
      assignment: {
        assignment_id: row.assignment_id,
        label: row.student_full_name,
        start_date: row.start_date,
        end_date: row.end_date,
        required_weekdays: row.required_weekdays,
      },
      daysByDate,
    });
  };

  const openEdit = (date: ISODate, record: AttendanceDay | null) =>
    setEditTarget({
      kind: "date",
      assignmentId: row.assignment_id,
      date,
      existing: record,
      studentName: row.student_full_name,
    });

  const handleDayClick = (date: ISODate, record: AttendanceDay | null) => {
    if (isSuperAdmin) openEdit(date, record);
    else if (record) setDetailDay(record);
  };

  const objectName = row.organization_name ?? row.area_name ?? "—";
  const pct = row.attendance_percent;

  return (
    <>
      <DialogHeader className="text-left">
        <DialogTitle className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <UserRound className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate">{row.student_full_name}</div>
            <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs font-normal text-muted-foreground">
              {row.student_hemis_id && <span className="font-mono">{row.student_hemis_id}</span>}
              {row.student_username && <span className="font-mono">@{row.student_username}</span>}
              {row.group_name && (
                <span>
                  {row.group_name}
                  {row.course !== null && ` · ${t("common.courseN", { n: row.course })}`}
                </span>
              )}
            </div>
          </div>
        </DialogTitle>
        <DialogDescription asChild>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            <span className="truncate">{objectName}</span>
            <span className="font-mono">
              {row.start_date} — {row.end_date}
            </span>
            {row.practice_type_name && <span>{row.practice_type_name}</span>}
            {row.semester && (
              <span>
                {row.semester === "fall" ? t("common.semesterFall") : t("common.semesterSpring")}
              </span>
            )}
          </div>
        </DialogDescription>
      </DialogHeader>

      {/* Hafta kunlari + statistika */}
      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
        <div>
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">
            {t("attendanceStudentView.requiredWeekdays", { defaultValue: "Talab qilingan kunlar" })}
          </div>
          <div
            className="flex gap-1"
            aria-label={t("attendanceStudentView.requiredWeekdays", {
              defaultValue: "Talab qilingan kunlar",
            })}
          >
            {WEEKDAY_KEYS.map((k, idx) => {
              const iso = idx + 1;
              const on = required.includes(iso);
              return (
                <span
                  key={k}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md border text-[11px] font-medium",
                    on
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground/50 line-through",
                  )}
                >
                  {t(`attendanceMonthGrid.weekdaysShort.${k}`, {
                    defaultValue: WEEKDAY_DEFAULTS[idx],
                  })}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat
            label={t("attendanceStudentView.expected", { defaultValue: "Kutilgan" })}
            value={row.expected_days_to_date ?? "—"}
          />
          <Stat
            label={t("adminAttendance.status.green")}
            value={row.green_count}
            tone="text-emerald-700 dark:text-emerald-300"
          />
          <Stat
            label={t("adminAttendance.status.red")}
            value={row.red_count}
            tone="text-rose-700 dark:text-rose-300"
          />
          <Stat
            label={t("adminAttendance.status.pending")}
            value={row.pending_count}
            tone="text-amber-700 dark:text-amber-300"
          />
          <div className="col-span-2 rounded-lg border bg-card p-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span>{t("attendanceStudentView.percent", { defaultValue: "Davomat %" })}</span>
              <span className="font-bold text-foreground">
                {pct === null ? "—" : `${Math.round(pct)}%`}
              </span>
            </div>
            <Progress value={pct ?? 0} className={cn("mt-2 h-2", percentTone(pct))} />
          </div>
        </div>
      </div>

      {/* Oy navigatsiyasi + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => shiftMonth(-1)}
            disabled={!canPrev}
            aria-label={t("studentAttendance.prevMonth")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9rem] text-center text-sm font-semibold capitalize">
            {monthLabel}
          </span>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => shiftMonth(1)}
            disabled={!canNext}
            aria-label={t("studentAttendance.nextMonth")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenInDaysList && (
            <Button size="sm" variant="ghost" onClick={() => onOpenInDaysList(row)}>
              <ListChecks className="h-4 w-4" />
              {t("attendanceStudentView.openInDays", { defaultValue: "Kunlar ro'yxati" })}
            </Button>
          )}
          {isSuperAdmin && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openRange({ date_from: visibleFrom, date_to: visibleTo })}
              >
                <CalendarRange className="h-4 w-4" />
                {t("attendanceRange.title", { defaultValue: "Oraliqni belgilash" })}
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() =>
                  openRange({ date_from: visibleFrom, date_to: visibleTo, status: "green" })
                }
              >
                <Sparkles className="h-4 w-4" />
                {t("attendanceStudentView.greenThisMonth", {
                  defaultValue: "Shu oyni yashil qilish",
                })}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {isPending && !data ? (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md sm:h-14" />
          ))}
        </div>
      ) : (
        <AttendanceMonthGrid
          year={view.year}
          month={view.month}
          daysByDate={daysByDate}
          rangeStart={row.start_date}
          rangeEnd={row.end_date}
          requiredWeekdays={row.required_weekdays}
          today={today}
          readOnly={!isSuperAdmin}
          onDayClick={handleDayClick}
          selectedDate={detailDay?.date ?? (editTarget?.kind === "date" ? editTarget.date : null)}
        />
      )}

      {isSuperAdmin && (
        <p className="text-xs text-muted-foreground">
          {t("attendanceStudentView.cellHint", {
            defaultValue: "Katakchani bosib kunni belgilang yoki tahrirlang (kelajak kunlar ham).",
          })}
        </p>
      )}

      {/* Oy kunlari ro'yxati */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4" />
          {t("attendanceStudentView.monthRecords", { defaultValue: "Shu oydagi yozuvlar" })}
          <span className="font-normal text-muted-foreground">({monthDays.length})</span>
          {isPending && data && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </h3>
        {monthDays.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            {t("attendanceStudentView.noMonthRecords", { defaultValue: "Bu oyda yozuv yo'q" })}
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {monthDays.map((d) => (
              <li key={d.id} className="flex items-center gap-2 p-2 sm:gap-3 sm:p-2.5">
                <button
                  type="button"
                  onClick={() => setDetailDay(d)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left hover:bg-accent/40"
                >
                  <span className="w-[5.5rem] shrink-0 font-mono text-sm">{d.date}</span>
                  <AttendanceStatusBadge status={d.status} />
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {fmtTime(d.check_in_at)} — {fmtTime(d.check_out_at)}
                  </span>
                  {d.note && (
                    <span className="hidden min-w-0 truncate text-xs italic text-muted-foreground md:inline">
                      {d.note}
                    </span>
                  )}
                </button>
                {isSuperAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => openEdit(d.date, d)}
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DayDetailDialog day={detailDay} onClose={() => setDetailDay(null)} />
      <DayEditDialog target={editTarget} onClose={() => setEditTarget(null)} />
      <RangeSetDialog
        target={rangeTarget}
        preset={rangePreset}
        onClose={() => setRangeTarget(null)}
      />
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-lg font-bold leading-tight", tone)}>{value}</div>
    </div>
  );
}
