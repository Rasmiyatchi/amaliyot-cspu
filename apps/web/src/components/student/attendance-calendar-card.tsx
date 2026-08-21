import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dateLocale } from "@/i18n";
import { useAttendanceDays } from "@/lib/api/attendance";
import type { AttendanceDay, PracticeAssignment } from "@/lib/api/types";

type Props = {
  assignment: PracticeAssignment;
};

const WEEKDAY_NAMES_UZ = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];

const pad2 = (n: number) => n.toString().padStart(2, "0");
const formatDateStr = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function formatTime(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleTimeString(dateLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(inTime: string | null, outTime: string | null): string | null {
  if (!inTime || !outTime) return null;
  const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
  if (diffMs <= 0) return null;
  const totalMins = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours} soat ${mins} daqiqa`;
  return `${mins} daqiqa`;
}

export function AttendanceCalendarCard({ assignment }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");
  const [selectedDay, setSelectedDay] = useState<AttendanceDay | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "green" | "red">("all");

  // Taqvim navigatsiyasi uchun joriy ko'rilayotgan oy/yil
  const [viewDate, setViewDate] = useState(() => new Date());

  // Ushbu biriktirish bo'yicha barcha davomat kunlarini yuklash (500 tagacha)
  const { data: daysData } = useAttendanceDays(
    { assignment_id: assignment.id },
    1,
    500,
    { enabled: !!assignment?.id },
  );

  const days = daysData?.items ?? [];

  // Sana bo'yicha map qilish (YYYY-MM-DD -> AttendanceDay)
  const daysByDate = useMemo(() => {
    const map = new Map<string, AttendanceDay>();
    for (const d of days) {
      map.set(d.date, d);
    }
    return map;
  }, [days]);

  // Statistikani hisoblash
  const stats = useMemo(() => {
    const greenCount = days.filter((d) => d.status === "green").length;
    const redCount = days.filter((d) => d.status === "red").length;
    const pendingCount = days.filter((d) => d.status === "pending").length;
    const totalRecorded = days.length;
    const pct = totalRecorded > 0 ? Math.round((greenCount / totalRecorded) * 100) : 0;

    return {
      greenCount,
      redCount,
      pendingCount,
      totalRecorded,
      pct,
    };
  }, [days]);

  // Kalendar katakchalarini hisoblash
  const calendarCells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // 0 = Yakshanba ... 6 = Shanba. Dushanba 1-kun bo'lishi uchun:
    // (day + 6) % 7 -> Dushanba=0, Yakshanba=6
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDays = lastDayOfMonth.getDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      dayRecord: AttendanceDay | null;
      isSunday: boolean;
      isToday: boolean;
      isWithinPractice: boolean;
      isFuture: boolean;
    }> = [];

    const todayStr = formatDateStr(new Date());
    const startDateStr = assignment.start_date;
    const endDateStr = assignment.end_date;

    // Oldingi oydan to'ldirish
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = formatDateStr(d);
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        dayRecord: daysByDate.get(dateStr) ?? null,
        isSunday: d.getDay() === 0,
        isToday: dateStr === todayStr,
        isWithinPractice: dateStr >= startDateStr && dateStr <= endDateStr,
        isFuture: dateStr > todayStr,
      });
    }

    // Joriy oy kunlari
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const d = new Date(year, month, dayNum);
      const dateStr = formatDateStr(d);
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        dayRecord: daysByDate.get(dateStr) ?? null,
        isSunday: d.getDay() === 0,
        isToday: dateStr === todayStr,
        isWithinPractice: dateStr >= startDateStr && dateStr <= endDateStr,
        isFuture: dateStr > todayStr,
      });
    }

    // Keyingi oydan to'ldirish (jadval to'liq 35 yoki 42 katak bo'lishi uchun)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = formatDateStr(d);
      cells.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        dayRecord: daysByDate.get(dateStr) ?? null,
        isSunday: d.getDay() === 0,
        isToday: dateStr === todayStr,
        isWithinPractice: dateStr >= startDateStr && dateStr <= endDateStr,
        isFuture: dateStr > todayStr,
      });
    }

    return cells;
  }, [viewDate, daysByDate, assignment.start_date, assignment.end_date]);

  const monthName = viewDate.toLocaleDateString(dateLocale(), {
    month: "long",
    year: "numeric",
  });

  const handlePrevMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleTodayMonth = () => {
    setViewDate(new Date());
  };

  const filteredDays = useMemo(() => {
    if (statusFilter === "all") return days;
    return days.filter((d) => d.status === statusFilter);
  }, [days, statusFilter]);

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <span>{t("studentAttendance.title", "Davomat va Taqvim")}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "studentAttendance.subtitle",
                "Kunlik amaliyot davomati, qatnashgan va qolib ketgan kunlar tarixi",
              )}
            </p>
          </div>

          {/* Switcher Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "calendar" | "list")}
            className="w-auto"
          >
            <TabsList className="grid grid-cols-2 h-8 w-44">
              <TabsTrigger value="calendar" className="text-xs gap-1.5 px-2">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{t("studentAttendance.tabCalendar", "Taqvim")}</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs gap-1.5 px-2">
                <List className="h-3.5 w-3.5" />
                <span>{t("studentAttendance.tabList", "Ro'yxat")}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* KPI Mini-Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          <div className="rounded-lg border bg-card p-2.5">
            <div className="text-[11px] font-medium text-muted-foreground">
              {t("studentAttendance.totalWorkdays", "Jami qaydlar")}
            </div>
            <div className="text-lg font-bold text-foreground mt-0.5">
              {stats.totalRecorded}{" "}
              <span className="text-xs font-normal text-muted-foreground">kun</span>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
            <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>{t("studentAttendance.presentDays", "Kelgan kunlar")}</span>
            </div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
              {stats.greenCount}{" "}
              <span className="text-xs font-normal text-emerald-600/80">kun</span>
            </div>
          </div>

          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2.5">
            <div className="text-[11px] font-medium text-rose-800 dark:text-rose-300 flex items-center gap-1">
              <XCircle className="h-3 w-3 text-rose-600" />
              <span>{t("studentAttendance.absentDays", "Qolib ketgan")}</span>
            </div>
            <div className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-0.5">
              {stats.redCount}{" "}
              <span className="text-xs font-normal text-rose-600/80">kun</span>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-2.5">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>{t("studentAttendance.attendanceRate", "Davomat")}</span>
              <span className="font-bold text-foreground">{stats.pct}%</span>
            </div>
            <Progress
              value={stats.pct}
              className={`h-2 mt-2 ${
                stats.pct >= 80
                  ? "[&>div]:bg-emerald-500"
                  : stats.pct >= 60
                  ? "[&>div]:bg-amber-500"
                  : "[&>div]:bg-rose-500"
              }`}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {/* 1. TAQVIM KO'RINISHI */}
        {activeTab === "calendar" && (
          <div className="space-y-4">
            {/* Oy navigatsiyasi */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold capitalize text-foreground">
                  {monthName}
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleTodayMonth}
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                >
                  {t("studentAttendance.today", "Bugun")}
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={handlePrevMonth}
                  title="Oldingi oy"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={handleNextMonth}
                  title="Keyingi oy"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Hafta kunlari sarlavhasi */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground pb-1 border-b">
              {WEEKDAY_NAMES_UZ.map((w, idx) => (
                <div
                  key={w}
                  className={idx === 6 ? "text-rose-500/80 dark:text-rose-400" : ""}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Taqvim katakchalari jadvali */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell) => {
                const rec = cell.dayRecord;
                const status = rec?.status;

                let cellStyle =
                  "border-border/60 bg-card hover:border-primary/50 text-foreground";
                let badgeNode = null;

                if (!cell.isCurrentMonth) {
                  cellStyle = "border-transparent bg-muted/10 opacity-30 text-muted-foreground";
                } else if (cell.isSunday) {
                  cellStyle =
                    "border-border/40 bg-muted/20 text-muted-foreground/80";
                } else if (status === "green") {
                  cellStyle =
                    "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 shadow-xs";
                  badgeNode = (
                    <div className="flex items-center justify-center h-2 w-2 rounded-full bg-emerald-500" />
                  );
                } else if (status === "red") {
                  cellStyle =
                    "border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-900 dark:text-rose-200 shadow-xs";
                  badgeNode = (
                    <div className="flex items-center justify-center h-2 w-2 rounded-full bg-rose-500" />
                  );
                } else if (status === "pending") {
                  cellStyle =
                    "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200";
                  badgeNode = (
                    <div className="flex items-center justify-center h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  );
                } else if (cell.isWithinPractice && !cell.isFuture && !cell.isSunday) {
                  // O'tgan amaliyot kuni bo'lib, yozuv yo'q bo'lsa
                  cellStyle = "border-border/60 bg-muted/30 text-muted-foreground";
                }

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => rec && setSelectedDay(rec)}
                    disabled={!rec}
                    className={`group relative flex flex-col items-center justify-between rounded-lg border p-1.5 sm:p-2 min-h-[56px] sm:min-h-[64px] transition-all text-left ${cellStyle} ${
                      cell.isToday
                        ? "ring-2 ring-primary ring-offset-1 font-bold"
                        : ""
                    } ${rec ? "cursor-pointer active:scale-95" : "cursor-default"}`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium">
                        {cell.dayNumber}
                      </span>
                      {badgeNode}
                    </div>

                    {rec && (
                      <div className="w-full mt-auto pt-1 text-[10px] sm:text-[11px] truncate flex items-center justify-between">
                        {status === "green" && (
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                            Yashil
                          </span>
                        )}
                        {status === "red" && (
                          <span className="text-rose-700 dark:text-rose-300 font-semibold">
                            Qizil
                          </span>
                        )}
                        {status === "pending" && (
                          <span className="text-amber-700 dark:text-amber-300 font-semibold">
                            Jarayonda
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Taqvim afsonasi (Legend) */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Yashil (Kelgan / Tasdiqlangan)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span>Qizil (Kelmagan / Qolib ketgan)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span>Kutilmoqda / Jarayonda</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. RO'YXAT KO'RINISHI */}
        {activeTab === "list" && (
          <div className="space-y-3">
            {/* Status filtr tugmalari */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <Button
                size="sm"
                variant={statusFilter === "all" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setStatusFilter("all")}
              >
                {t("studentAttendance.filterAll", "Barchasi")} ({days.length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "green" ? "default" : "outline"}
                className="h-7 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                onClick={() => setStatusFilter("green")}
              >
                {t("studentAttendance.filterPresent", "Faqat kelganlar")} (
                {stats.greenCount})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "red" ? "default" : "outline"}
                className="h-7 text-xs text-rose-700 dark:text-rose-300 border-rose-500/30"
                onClick={() => setStatusFilter("red")}
              >
                {t("studentAttendance.filterAbsent", "Qolib ketganlar")} (
                {stats.redCount})
              </Button>
            </div>

            {filteredDays.length === 0 && (
              <EmptyState
                icon={CalendarIcon}
                title={t("studentAttendance.noRecords", "Davomat yozuvlari yo'q")}
                description="Filtr bo'yicha hech qanday davomat topilmadi"
                compact
              />
            )}

            {filteredDays.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredDays.map((d) => {
                  const duration = formatDuration(d.check_in_at, d.check_out_at);
                  const isRed = d.status === "red";
                  const isGreen = d.status === "green";

                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDay(d)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3 cursor-pointer transition-all hover:border-primary/50 ${
                        isGreen
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : isRed
                          ? "border-rose-500/20 bg-rose-500/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {d.date}
                          </span>
                          {d.note && (
                            <span className="text-xs text-muted-foreground italic truncate max-w-xs">
                              — {d.note}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                          {d.check_in_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(d.check_in_at)}</span>
                              {d.check_out_at && (
                                <span>— {formatTime(d.check_out_at)}</span>
                              )}
                            </span>
                          )}
                          {duration && (
                            <span className="font-medium text-foreground bg-muted/60 px-1.5 py-0.5 rounded text-[11px]">
                              {duration}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="self-start sm:self-center shrink-0">
                        <AttendanceStatusBadge status={d.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Kunlik batafsil ma'lumot modali */}
      <Dialog
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-lg">
                {selectedDay?.date} {t("studentAttendance.dayDetailTitle", "Davomati")}
              </DialogTitle>
              {selectedDay && <AttendanceStatusBadge status={selectedDay.status} />}
            </div>
            <DialogDescription>
              {selectedDay?.status === "green"
                ? "Davomat muvaffaqiyatli yakunlangan (Yashil)"
                : selectedDay?.status === "red"
                ? "Amaliyot kuniga kelinmagan yoki qolib ketgan (Qizil)"
                : "Davomat jarayonda (Kutilmoqda)"}
            </DialogDescription>
          </DialogHeader>

          {selectedDay && (
            <div className="space-y-3 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                <div>
                  <span className="text-xs text-muted-foreground">Kelish vaqti:</span>
                  <div className="font-medium text-foreground">
                    {formatTime(selectedDay.check_in_at)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Ketish vaqti:</span>
                  <div className="font-medium text-foreground">
                    {formatTime(selectedDay.check_out_at)}
                  </div>
                </div>
              </div>

              {selectedDay.check_in_at && selectedDay.check_out_at && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    <span>Amaliyot davomiyligi:</span>
                  </span>
                  <strong className="text-foreground">
                    {formatDuration(
                      selectedDay.check_in_at,
                      selectedDay.check_out_at,
                    )}
                  </strong>
                </div>
              )}

              {selectedDay.note && (
                <div className="rounded-lg bg-muted/30 p-3 text-xs">
                  <span className="font-semibold text-muted-foreground block mb-1">
                    Izoh / Sabab:
                  </span>
                  <p className="text-foreground">{selectedDay.note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
