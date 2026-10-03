import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  buildMonthCells,
  effectiveWeekdays,
  formatMonthLabel,
  formatTashkentDate,
  todayStr,
} from "@/components/attendance/attendance-date-utils";
import { dateLocale } from "@/i18n";
import type { AttendanceDay, AttendanceDayStatus, ISODate } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Props = {
  year: number;
  /** 0 = yanvar */
  month: number;
  daysByDate: ReadonlyMap<ISODate, AttendanceDay>;
  rangeStart: ISODate;
  rangeEnd: ISODate;
  /** ISO 1..7; null → Dush–Shan */
  requiredWeekdays: readonly number[] | null;
  /** Test/SSR uchun; default — bugun (Toshkent) */
  today?: ISODate;
  /** readOnly=true bo'lsa faqat yozuvli kunlar bosiladi; aks holda oraliqdagi barcha kunlar */
  readOnly?: boolean;
  onDayClick?: (date: ISODate, record: AttendanceDay | null) => void;
  selectedDate?: ISODate | null;
  showLegend?: boolean;
  className?: string;
};

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const STATUS_CELL: Record<AttendanceDayStatus, string> = {
  green:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 hover:bg-emerald-500/20 dark:text-emerald-200",
  red: "border-rose-500/40 bg-rose-500/10 text-rose-900 hover:bg-rose-500/20 dark:text-rose-200",
  pending:
    "border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:text-amber-200",
};

const STATUS_DOT: Record<AttendanceDayStatus, string> = {
  green: "bg-emerald-500",
  red: "bg-rose-500",
  pending: "bg-amber-500 animate-pulse",
};

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };

/**
 * Qayta ishlatiladigan oy taqvimi (prezentatsion).
 * Dushanbadan boshlanadi, 7 ustun. Rang — status bo'yicha (yozuv har doim ustun turadi);
 * talab qilinmagan kunlar xira; kelajak kunlar yengilroq; bugun — ring.
 * Har bir katak to'liq nomli tugma (sana · status), sarlavha qatori faqat vizual.
 */
export function AttendanceMonthGrid({
  year,
  month,
  daysByDate,
  rangeStart,
  rangeEnd,
  requiredWeekdays,
  today,
  readOnly = false,
  onDayClick,
  selectedDate,
  showLegend = true,
  className,
}: Props) {
  const { t } = useTranslation();
  const todayValue = today ?? todayStr();
  const locale = dateLocale();

  const cells = useMemo(
    () =>
      buildMonthCells({
        year,
        month,
        daysByDate,
        rangeStart,
        rangeEnd,
        requiredWeekdays,
        today: todayValue,
      }),
    [year, month, daysByDate, rangeStart, rangeEnd, requiredWeekdays, todayValue],
  );

  const required = useMemo(() => new Set(effectiveWeekdays(requiredWeekdays)), [requiredWeekdays]);

  const monthLabel = formatMonthLabel(year, month, locale);

  const statusLabel = (s: AttendanceDayStatus) => t(`adminAttendance.status.${s}`);
  const notRequiredLabel = t("attendanceMonthGrid.notRequired");

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="grid grid-cols-7 gap-1 border-b pb-1 text-center text-[11px] font-semibold text-muted-foreground sm:text-xs"
        aria-hidden="true"
      >
        {WEEKDAY_KEYS.map((k, idx) => (
          <div
            key={k}
            className={required.has(idx + 1) ? undefined : "text-rose-500/80 dark:text-rose-400"}
          >
            {t(`attendanceMonthGrid.weekdays.${k}`)}
          </div>
        ))}
      </div>

      <div role="group" aria-label={monthLabel} className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((cell) => {
          const status = cell.record?.status ?? null;
          const clickable =
            !!onDayClick && cell.inMonth && cell.inRange && (readOnly ? !!cell.record : true);

          let look = "border-border/60 bg-card text-foreground";
          if (!cell.inMonth) {
            look = "border-transparent bg-muted/10 text-muted-foreground opacity-30";
          } else if (!cell.inRange) {
            look = "border-dashed border-border/40 bg-muted/10 text-muted-foreground/60";
          } else if (status) {
            look = STATUS_CELL[status];
          } else if (!cell.isRequired) {
            look = "border-border/40 bg-muted/30 text-muted-foreground/70";
          } else if (!cell.isFuture) {
            // o'tgan talab qilingan kun, yozuv yo'q
            look = "border-border/60 bg-muted/40 text-muted-foreground";
          }

          const label = [
            formatTashkentDate(cell.date, locale, LONG_DATE),
            status ? statusLabel(status) : null,
            cell.inMonth && cell.inRange && !cell.isRequired ? notRequiredLabel : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <button
              key={cell.date}
              type="button"
              aria-label={label}
              aria-current={cell.isToday ? "date" : undefined}
              title={label}
              disabled={!clickable}
              onClick={() => clickable && onDayClick?.(cell.date, cell.record)}
              className={cn(
                "relative flex min-h-[44px] flex-col items-start justify-between rounded-md border p-1 text-left transition-all sm:min-h-[56px] sm:p-1.5",
                look,
                cell.isFuture && cell.inMonth && cell.inRange && "opacity-80",
                cell.isToday &&
                  "font-bold ring-2 ring-primary ring-offset-1 ring-offset-background",
                selectedDate === cell.date && "ring-2 ring-primary/70",
                clickable
                  ? "cursor-pointer hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                  : "cursor-default",
              )}
            >
              <span className="flex w-full items-center justify-between gap-1">
                <span className="text-[11px] font-medium sm:text-xs">{cell.dayNumber}</span>
                {status && (
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2", STATUS_DOT[status])}
                  />
                )}
              </span>
              {status && cell.inMonth && (
                <span className="hidden w-full truncate text-[10px] font-semibold sm:block">
                  {statusLabel(status)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground sm:text-xs">
          <LegendItem dot="bg-emerald-500" label={statusLabel("green")} />
          <LegendItem dot="bg-rose-500" label={statusLabel("red")} />
          <LegendItem dot="bg-amber-500" label={statusLabel("pending")} />
          <LegendItem dot="bg-muted-foreground/30" label={notRequiredLabel} />
          <LegendItem
            dot="ring-2 ring-primary bg-transparent"
            label={t("attendanceMonthGrid.today")}
          />
        </div>
      )}
    </div>
  );
}

function LegendItem({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", dot)} />
      <span>{label}</span>
    </span>
  );
}
