import type { TFunction } from "i18next";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hourglass,
  List,
  RotateCw,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import {
  attendanceStatsToDate,
  capitalizeFirst,
  clampDateStr,
  compareMonth,
  formatMonthLabel,
  formatTashkentDate,
  formatTashkentTime,
  monthOf,
} from "@/components/attendance/attendance-date-utils";
import { AttendanceMonthGrid } from "@/components/attendance/attendance-month-grid";
import { describeRequestError } from "@/components/attendance/request-error";
import { useTashkentToday } from "@/components/attendance/use-tashkent-today";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dateLocale } from "@/i18n";
import { useAttendanceDays } from "@/lib/api/attendance";
import type {
  AttendanceDay,
  AttendanceDayStatus,
  ISODate,
  PracticeAssignment,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Props = {
  assignment: PracticeAssignment;
};

type ViewTab = "calendar" | "list";
type ListFilter = "all" | AttendanceDayStatus;

/** Bitta biriktirishda 500 tagacha kun (30 haftalik amaliyot ~210 kun) */
const MAX_DAYS = 500;
const LIST_FILTERS: ListFilter[] = ["all", "green", "red", "pending"];

const STATUS_PILL: Record<AttendanceDayStatus, "success" | "destructive" | "warning"> = {
  green: "success",
  red: "destructive",
  pending: "warning",
};

const DAY_HEADING: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};
const ROW_DATE: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };

function formatDuration(
  inTime: string | null,
  outTime: string | null,
  t: TFunction,
): string | null {
  if (!inTime || !outTime) return null;
  const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return null;
  const totalMins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours} ${t("common.hours")} ${mins} ${t("common.minutes")}`;
  return `${mins} ${t("common.minutes")}`;
}

function percentTone(p: number | null): string {
  if (p === null) return "[&>div]:bg-muted-foreground/40";
  if (p >= 80) return "[&>div]:bg-emerald-500";
  if (p >= 60) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-rose-500";
}

/** <button> ichida <div> bo'lmasin — Badge o'rniga span. */
function StatusPill({ status }: { status: AttendanceDayStatus }) {
  const { t } = useTranslation();
  return (
    <span className={badgeVariants({ variant: STATUS_PILL[status] })}>
      {t(`attendanceAttendanceStatusBadge.status.${status}`)}
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  /** null → "—" (hisoblab bo'lmaydi) */
  value: number | null;
  tone?: string;
  icon?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn("rounded-lg border bg-card p-2.5", tone ?? "text-foreground")}>
      <div className="flex items-center gap-1 text-[11px] font-medium opacity-80">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">
        {value === null ? (
          "—"
        ) : (
          <>
            {value}{" "}
            <span className="text-xs font-normal opacity-80">
              {t("studentAttendance.daysSuffix")}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function AttendanceCalendarCard({ assignment }: Props) {
  const { t } = useTranslation();
  const locale = dateLocale();
  const today = useTashkentToday();
  const [tab, setTab] = useState<ViewTab>("calendar");
  const [selected, setSelected] = useState<AttendanceDay | null>(null);
  const [filter, setFilter] = useState<ListFilter>("all");

  const startMonth = useMemo(() => monthOf(assignment.start_date), [assignment.start_date]);
  const endMonth = useMemo(() => monthOf(assignment.end_date), [assignment.end_date]);
  const [view, setView] = useState(() =>
    monthOf(clampDateStr(today, assignment.start_date, assignment.end_date)),
  );

  const { data, isPending, error, refetch, isFetching } = useAttendanceDays(
    { assignment_id: assignment.id },
    1,
    MAX_DAYS,
  );
  const days = useMemo(() => data?.items ?? [], [data]);

  // Yarim tundan keyin: kechagi "kutilmoqda" kun serverda qizilga aylangan bo'lishi mumkin
  const lastDayRef = useRef(today);
  useEffect(() => {
    if (lastDayRef.current === today) return;
    lastDayRef.current = today;
    void refetch();
  }, [today, refetch]);

  const daysByDate = useMemo(() => {
    const map = new Map<ISODate, AttendanceDay>();
    for (const d of days) map.set(d.date, d);
    return map;
  }, [days]);

  // Server formulasi: bugungacha yashil ÷ bugungacha kutilgan (talab qilingan) kunlar
  const stats = useMemo(
    () =>
      attendanceStatsToDate({
        days,
        rangeStart: assignment.start_date,
        rangeEnd: assignment.end_date,
        requiredWeekdays: assignment.required_weekdays,
        today,
      }),
    [days, assignment.start_date, assignment.end_date, assignment.required_weekdays, today],
  );

  const recordCounts = useMemo(() => {
    const counts: Record<ListFilter, number> = { all: days.length, green: 0, red: 0, pending: 0 };
    for (const d of days) counts[d.status] += 1;
    return counts;
  }, [days]);

  const filteredDays = useMemo(
    () => (filter === "all" ? days : days.filter((d) => d.status === filter)),
    [days, filter],
  );

  const canPrev = compareMonth(view, startMonth) > 0;
  const canNext = compareMonth(view, endMonth) < 0;
  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const monthName = formatMonthLabel(view.year, view.month, locale);

  const pct = stats.percent;
  const filterLabel: Record<ListFilter, string> = {
    all: t("studentAttendance.filterAll"),
    green: t("studentAttendance.filterPresent"),
    red: t("studentAttendance.filterAbsent"),
    pending: t("studentAttendance.filterPending"),
  };

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      <Tabs value={tab} onValueChange={(v) => setTab(v as ViewTab)}>
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <CalendarIcon className="h-5 w-5 shrink-0 text-primary" />
                <span>{t("studentAttendance.title")}</span>
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("studentAttendance.subtitle")}
              </p>
            </div>

            <TabsList className="grid h-8 w-full grid-cols-2 sm:w-44">
              <TabsTrigger value="calendar" className="gap-1.5 px-2 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{t("studentAttendance.tabCalendar")}</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5 px-2 text-xs">
                <List className="h-3.5 w-3.5" />
                <span>{t("studentAttendance.tabList")}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* KPI — bugungacha bo'lgan holat (admin jamlanmasi bilan bir xil hisob) */}
          <div className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-5">
            <Stat label={t("studentAttendance.expectedDays")} value={stats.expected} />
            <Stat
              label={t("studentAttendance.presentDays")}
              value={stats.green}
              tone="border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
              icon={<CheckCircle2 className="h-3 w-3 shrink-0" />}
            />
            <Stat
              label={t("studentAttendance.absentDays")}
              value={stats.red}
              tone="border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-300"
              icon={<XCircle className="h-3 w-3 shrink-0" />}
            />
            <Stat
              label={t("studentAttendance.pendingDays")}
              value={stats.pending}
              tone="border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300"
              icon={<Hourglass className="h-3 w-3 shrink-0" />}
            />
            <div className="col-span-2 rounded-lg border bg-card p-2.5 sm:col-span-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>{t("studentAttendance.attendanceRate")}</span>
                <span className="font-bold text-foreground">{pct === null ? "—" : `${pct}%`}</span>
              </div>
              <Progress
                value={pct ?? 0}
                className={cn("mt-2 h-2", percentTone(pct))}
                aria-label={t("studentAttendance.attendanceRate")}
              />
            </div>
          </div>
          <p className="pt-2 text-[11px] text-muted-foreground">
            {pct === null
              ? t("studentAttendance.percentNotStarted")
              : t("studentAttendance.percentHint", {
                  green: stats.green,
                  expected: stats.denominator,
                })}
            {stats.futureGreen > 0 &&
              ` ${t("studentAttendance.futureGreenHint", { count: stats.futureGreen })}`}
          </p>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {error && (
            <Alert variant="destructive" className="mb-3">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>{describeRequestError(error, t)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                >
                  <RotateCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                  {t("studentDashboard.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* 1. TAQVIM */}
          <TabsContent value="calendar" className="mt-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">{monthName}</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setView(
                      monthOf(clampDateStr(today, assignment.start_date, assignment.end_date)),
                    )
                  }
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("studentAttendance.today")}
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => shiftMonth(-1)}
                  disabled={!canPrev}
                  aria-label={t("studentAttendance.prevMonth")}
                  title={t("studentAttendance.prevMonth")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => shiftMonth(1)}
                  disabled={!canNext}
                  aria-label={t("studentAttendance.nextMonth")}
                  title={t("studentAttendance.nextMonth")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isPending && !data ? (
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 rounded-md sm:h-14" />
                ))}
              </div>
            ) : (
              <AttendanceMonthGrid
                year={view.year}
                month={view.month}
                daysByDate={daysByDate}
                rangeStart={assignment.start_date}
                rangeEnd={assignment.end_date}
                requiredWeekdays={assignment.required_weekdays}
                today={today}
                readOnly
                onDayClick={(_date, record) => record && setSelected(record)}
                selectedDate={selected?.date ?? null}
              />
            )}
          </TabsContent>

          {/* 2. RO'YXAT */}
          <TabsContent value="list" className="mt-0 space-y-3">
            <div
              role="group"
              aria-label={t("studentAttendance.filterLabel")}
              className="flex flex-wrap items-center gap-2 pb-2"
            >
              {LIST_FILTERS.map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  className="h-7 text-xs"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {filterLabel[f]} ({recordCounts[f]})
                </Button>
              ))}
            </div>

            {isPending && !data && (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            )}

            {data && filteredDays.length === 0 && (
              <EmptyState
                icon={CalendarIcon}
                title={t("studentAttendance.noRecords")}
                description={
                  filter === "all"
                    ? t("student.noAttendanceDescription")
                    : t("studentAttendance.noRecordsFiltered")
                }
                compact
              />
            )}

            {filteredDays.length > 0 && (
              <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {filteredDays.map((d) => {
                  const duration = formatDuration(d.check_in_at, d.check_out_at, t);
                  const isFuture = d.date > today;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(d)}
                        className={cn(
                          "flex w-full flex-col justify-between gap-2 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center",
                          d.status === "green"
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : d.status === "red"
                              ? "border-rose-500/20 bg-rose-500/5"
                              : "border-border bg-card",
                        )}
                      >
                        <span className="block min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-sm font-semibold text-foreground">
                              {capitalizeFirst(
                                formatTashkentDate(d.date, locale, ROW_DATE),
                                locale,
                              )}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {d.date}
                            </span>
                            {isFuture && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {t("studentAttendance.preSet")}
                              </span>
                            )}
                          </span>
                          {d.note && (
                            <span className="mt-0.5 block truncate text-xs italic text-muted-foreground">
                              {d.note}
                            </span>
                          )}
                          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {d.check_in_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatTashkentTime(d.check_in_at, locale)}</span>
                                {d.check_out_at && (
                                  <span>— {formatTashkentTime(d.check_out_at, locale)}</span>
                                )}
                              </span>
                            )}
                            {duration && (
                              <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                                {duration}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 self-start sm:self-center">
                          <StatusPill status={d.status} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>

      {/* Kunlik batafsil ma'lumot */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader className="text-left">
                <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                  <DialogTitle className="text-lg">
                    {capitalizeFirst(
                      formatTashkentDate(selected.date, locale, DAY_HEADING),
                      locale,
                    )}
                  </DialogTitle>
                  <AttendanceStatusBadge status={selected.status} />
                </div>
                <DialogDescription>
                  {selected.date > today && selected.status === "green"
                    ? t("studentAttendance.dayDescPreApproved")
                    : selected.date > today && selected.status === "red"
                      ? t("studentAttendance.dayDescPreMarkedRed")
                      : t(`studentAttendance.dayDesc.${selected.status}`)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2 text-sm">
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {t("studentAttendance.checkInTime")}
                    </span>
                    <div className="font-medium text-foreground">
                      {formatTashkentTime(selected.check_in_at, locale)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {t("studentAttendance.checkOutTime")}
                    </span>
                    <div className="font-medium text-foreground">
                      {formatTashkentTime(selected.check_out_at, locale)}
                    </div>
                  </div>
                </div>

                {selected.check_in_at && selected.check_out_at && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t("studentAttendance.duration")}</span>
                    </span>
                    <strong className="text-foreground">
                      {formatDuration(selected.check_in_at, selected.check_out_at, t)}
                    </strong>
                  </div>
                )}

                {selected.note && (
                  <div className="rounded-lg bg-muted/30 p-3 text-xs">
                    <span className="mb-1 block font-semibold text-muted-foreground">
                      {t("studentAttendance.noteLabel")}
                    </span>
                    <p className="break-words text-foreground">{selected.note}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
