import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dateLocale } from "@/i18n";
import type { AttendanceSummaryRow } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Props = {
  rows: AttendanceSummaryRow[];
  total: number;
  page: number;
  pageSize: number;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onRowClick: (row: AttendanceSummaryRow) => void;
  selectable: boolean;
  selectedIds: ReadonlySet<string>;
  onToggleRow: (assignmentId: string) => void;
  onToggleAllVisible: () => void;
};

function pctTone(p: number | null): { bar: string; text: string } {
  if (p === null) return { bar: "[&>div]:bg-muted-foreground/40", text: "text-muted-foreground" };
  if (p >= 80)
    return { bar: "[&>div]:bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" };
  if (p >= 60) return { bar: "[&>div]:bg-amber-500", text: "text-amber-700 dark:text-amber-300" };
  return { bar: "[&>div]:bg-rose-500", text: "text-rose-700 dark:text-rose-300" };
}

function fmtLast(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString(dateLocale(), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AttendanceSummaryTable({
  rows,
  total,
  page,
  pageSize,
  isFetching,
  onPageChange,
  onRowClick,
  selectable,
  selectedIds,
  onToggleRow,
  onToggleAllVisible,
}: Props) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.assignment_id));

  const selectAllLabel = t("common.selectAll", { defaultValue: "Sahifadagi barchasi" });

  return (
    <div className="space-y-3">
      {/* Mobil: kartalar */}
      <ul className="space-y-2 md:hidden">
        {selectable && (
          <li className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={onToggleAllVisible}
              className="h-4 w-4 rounded border-input accent-primary"
              aria-label={selectAllLabel}
            />
            {selectAllLabel}
          </li>
        )}
        {rows.map((r) => {
          const tone = pctTone(r.attendance_percent);
          return (
            <li
              key={r.assignment_id}
              className={cn(
                "flex gap-2 rounded-lg border bg-card p-3",
                selectedIds.has(r.assignment_id) && "border-primary/50 bg-primary/5",
              )}
            >
              {selectable && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.assignment_id)}
                  onChange={() => onToggleRow(r.assignment_id)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary"
                  aria-label={r.student_full_name}
                />
              )}
              <button
                type="button"
                onClick={() => onRowClick(r)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.student_full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.student_hemis_id ?? r.student_username ?? "—"}
                      {r.group_name && ` · ${r.group_name}`}
                      {r.course !== null && ` · ${t("common.courseN", { n: r.course })}`}
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {r.organization_name ?? r.area_name ?? "—"} · {r.start_date} — {r.end_date}
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="text-emerald-700 dark:text-emerald-300">
                    {t("adminAttendance.status.green")}: <b>{r.green_count}</b>
                  </span>
                  <span className="text-rose-700 dark:text-rose-300">
                    {t("adminAttendance.status.red")}: <b>{r.red_count}</b>
                  </span>
                  <span className="text-amber-700 dark:text-amber-300">
                    {t("adminAttendance.status.pending")}: <b>{r.pending_count}</b>
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Progress
                    value={r.attendance_percent ?? 0}
                    className={cn("h-1.5 flex-1", tone.bar)}
                    aria-label={t("attendanceStudentView.percent", { defaultValue: "Davomat %" })}
                  />
                  <span className={cn("w-10 text-right text-xs font-semibold", tone.text)}>
                    {r.attendance_percent === null ? "—" : `${Math.round(r.attendance_percent)}%`}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Desktop: jadval */}
      <div className="hidden rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-[40px] px-2 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={onToggleAllVisible}
                    className="h-4 w-4 cursor-pointer rounded border-input accent-primary"
                    aria-label={selectAllLabel}
                  />
                </TableHead>
              )}
              <TableHead>{t("common.student")}</TableHead>
              <TableHead>
                {t("common.group")}/{t("common.course")}
              </TableHead>
              <TableHead>{t("adminAttendance.object")}</TableHead>
              <TableHead>{t("adminAttendance.period", { defaultValue: "Muddat" })}</TableHead>
              <TableHead className="text-right">
                {t("attendanceStudentView.expected", { defaultValue: "Kutilgan" })}
              </TableHead>
              <TableHead className="text-right text-emerald-700 dark:text-emerald-300">
                {t("adminAttendance.status.green")}
              </TableHead>
              <TableHead className="text-right text-rose-700 dark:text-rose-300">
                {t("adminAttendance.status.red")}
              </TableHead>
              <TableHead className="text-right text-amber-700 dark:text-amber-300">
                {t("adminAttendance.status.pending")}
              </TableHead>
              <TableHead className="min-w-[140px]">
                {t("attendanceStudentView.percent", { defaultValue: "Davomat %" })}
              </TableHead>
              <TableHead>
                {t("adminAttendance.lastCheckIn", { defaultValue: "Oxirgi kelish" })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const tone = pctTone(r.attendance_percent);
              return (
                <TableRow
                  key={r.assignment_id}
                  onClick={() => onRowClick(r)}
                  className={cn(
                    "cursor-pointer",
                    selectedIds.has(r.assignment_id) && "bg-primary/5",
                  )}
                >
                  {selectable && (
                    <TableCell
                      className="w-[40px] px-2 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.assignment_id)}
                        onChange={() => onToggleRow(r.assignment_id)}
                        className="h-4 w-4 cursor-pointer rounded border-input accent-primary"
                        aria-label={r.student_full_name}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="font-medium">{r.student_full_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {r.student_hemis_id ?? "—"}
                      {r.student_username && ` · @${r.student_username}`}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{r.group_name ?? "—"}</div>
                    {r.course !== null && (
                      <div className="text-xs text-muted-foreground">
                        {t("common.courseN", { n: r.course })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm">
                    {r.organization_name ?? r.area_name ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {r.start_date}
                    <br />
                    {r.end_date}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.expected_days_to_date ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {r.green_count}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                    {r.red_count}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-amber-700 dark:text-amber-300">
                    {r.pending_count}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={r.attendance_percent ?? 0}
                        className={cn("h-1.5 flex-1", tone.bar)}
                      />
                      <span className={cn("w-10 text-right text-xs font-semibold", tone.text)}>
                        {r.attendance_percent === null
                          ? "—"
                          : `${Math.round(r.attendance_percent)}%`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {fmtLast(r.last_check_in_at)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div>
          {t("common.total")}: <span className="font-medium text-foreground">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isFetching}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("common.previous")}
          </Button>
          <span className="px-2 tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isFetching}
          >
            {t("common.next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
