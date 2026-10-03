import {
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { BulkOverrideDialog } from "@/components/admin/attendance/bulk-override-dialog";
import { DayDetailDialog } from "@/components/admin/attendance/day-detail-dialog";
import { formatTashkentTime } from "@/components/attendance/attendance-date-utils";
import { describeRequestError } from "@/components/attendance/request-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { dateLocale } from "@/i18n";
import { useAllGroups, useDirections, useFaculties } from "@/lib/api/academic";
import { useAttendanceDays, type AttendanceFilters } from "@/lib/api/attendance";
import { downloadExport } from "@/lib/api/exports";
import type { AttendanceDay, AttendanceDayStatus, UUID } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

const ALL = "__all__";
const PAGE_SIZE = 50;

/** Talabalar tabidan kelganda: bitta biriktirish bo'yicha ro'yxat. */
export type DaysAssignmentPreset = { assignment_id: UUID; label: string };

type Props = {
  preset: DaysAssignmentPreset | null;
  onClearPreset: () => void;
};

/** Kelish/ketish — Toshkent vaqtida. */
const fmtTime = (s: string | null) => formatTashkentTime(s, dateLocale());

export function AttendanceDaysTab({ preset, onClearPreset }: Props) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === "super_admin";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 350);
  const [filters, setFilters] = useState<AttendanceFilters>({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AttendanceDay | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkTargetStatus, setBulkTargetStatus] = useState<AttendanceDayStatus | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Funksional yangilash — filters obyekti faqat haqiqiy o'zgarishda yangilanadi
  const patch = useCallback((p: Partial<AttendanceFilters>) => {
    setFilters((prev) => ({ ...prev, ...p }));
    setPage(1);
  }, []);

  const queryFilters: AttendanceFilters = {
    ...filters,
    assignment_id: preset?.assignment_id ?? filters.assignment_id,
    search: debouncedSearch || undefined,
  };

  const { data, isPending, error, isFetching } = useAttendanceDays(queryFilters, page, PAGE_SIZE);
  const items = data?.items ?? [];

  // Filtr/sahifa o'zgarsa tanlov tozalanadi (filters faqat haqiqiy o'zgarishda yangi obyekt)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, page, debouncedSearch, preset]);

  const faculties = useFaculties();
  const directions = useDirections(filters.faculty_id);
  // Barcha guruhlar (ilgari birinchi 100 tasi bilan cheklanardi)
  const groups = useAllGroups({ directionId: filters.direction_id });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const toggleSelectRow = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAllVisible = () => {
    const visibleIds = items.map((d) => d.id);
    const allOn = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const selectByStatus = (status: AttendanceDayStatus) =>
    setSelectedIds(new Set(items.filter((d) => d.status === status).map((d) => d.id)));

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadExport("attendance", {
        assignment_id: queryFilters.assignment_id,
        student_id: queryFilters.student_id,
        status: queryFilters.status,
        group_id: queryFilters.group_id,
        direction_id: queryFilters.direction_id,
        faculty_id: queryFilters.faculty_id,
        date_from: queryFilters.date_from,
        date_to: queryFilters.date_to,
        // Ekrandagi ro'yxat bilan bir xil bo'lsin (qidiruv ham)
        search: queryFilters.search,
      });
      toast.success(t("common.csvDownloaded"));
    } catch (e) {
      toast.error(describeRequestError(e, t));
    } finally {
      setExporting(false);
    }
  };

  const hasFilters =
    !!search ||
    !!filters.status ||
    !!filters.date_from ||
    !!filters.date_to ||
    !!filters.faculty_id ||
    !!filters.direction_id ||
    !!filters.group_id;

  return (
    <div className="space-y-4">
      {preset && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-info/40 bg-info/5 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("adminAttendance.assignment")}:</span>
          <span className="font-medium">{preset.label}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onClearPreset}
            aria-label={t("common.clear")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Qidiruv + eksport */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("adminAttendance.searchPlaceholder")}
            aria-label={t("common.search")}
            className="pl-9"
            autoComplete="off"
          />
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {t("adminAttendance.csvExport")}
        </Button>
      </div>

      {/* Filtrlar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="days-faculty" className="text-xs">
            {t("common.faculty")}
          </Label>
          <Select
            value={filters.faculty_id ?? ALL}
            onValueChange={(v) =>
              patch({
                faculty_id: v === ALL ? undefined : v,
                direction_id: undefined,
                group_id: undefined,
              })
            }
          >
            <SelectTrigger id="days-faculty" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>{t("adminAttendance.allFaculties")}</SelectItem>
              {(faculties.data?.items ?? []).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="days-direction" className="text-xs">
            {t("common.direction")}
          </Label>
          <Select
            value={filters.direction_id ?? ALL}
            onValueChange={(v) =>
              patch({ direction_id: v === ALL ? undefined : v, group_id: undefined })
            }
          >
            <SelectTrigger id="days-direction" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>{t("adminAttendance.allDirections")}</SelectItem>
              {(directions.data?.items ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="days-group" className="text-xs">
            {t("common.group")}
          </Label>
          <Select
            value={filters.group_id ?? ALL}
            onValueChange={(v) => patch({ group_id: v === ALL ? undefined : v })}
          >
            <SelectTrigger id="days-group" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>{t("adminAttendance.allGroups")}</SelectItem>
              {(groups.data ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name} ({t("common.courseN", { n: g.course })})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="days-status" className="text-xs">
            {t("common.status")}
          </Label>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(v) =>
              patch({ status: v === ALL ? undefined : (v as AttendanceDayStatus) })
            }
          >
            <SelectTrigger id="days-status" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.all")}</SelectItem>
              <SelectItem value="pending">{t("adminAttendance.status.pending")}</SelectItem>
              <SelectItem value="green">{t("adminAttendance.status.green")}</SelectItem>
              <SelectItem value="red">{t("adminAttendance.status.red")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="days-date-from" className="text-xs">
            {t("adminAttendance.dateFrom")}
          </Label>
          <Input
            id="days-date-from"
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) => patch({ date_from: e.target.value || undefined })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="days-date-to" className="text-xs">
            {t("adminAttendance.dateTo")}
          </Label>
          <Input
            id="days-date-to"
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) => patch({ date_to: e.target.value || undefined })}
            className="mt-1"
          />
        </div>

        <div className="flex items-end sm:col-span-2">
          {hasFilters && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setFilters({});
                setPage(1);
              }}
            >
              <X className="h-4 w-4" />
              {t("common.clear")}
            </Button>
          )}
        </div>
      </div>

      {/* Super Admin — ommaviy amallar paneli */}
      {isSuperAdmin && items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">
              {t("adminAttendance.selectedCount", { count: selectedIds.size })}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">{t("common.quickSelect")}</span>
              <button
                type="button"
                onClick={() => selectByStatus("pending")}
                className="cursor-pointer rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
              >
                {t("adminAttendance.selectPending")}
              </button>
              <button
                type="button"
                onClick={() => selectByStatus("red")}
                className="cursor-pointer rounded bg-rose-100 px-2 py-0.5 font-medium text-rose-800 transition-colors hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300"
              >
                {t("adminAttendance.selectRed")}
              </button>
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="cursor-pointer rounded bg-secondary px-2 py-0.5 font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                {t("common.selectAll")}
              </button>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  setBulkTargetStatus("green");
                  setBulkDialogOpen(true);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("adminAttendance.bulkApproveBtn")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setBulkTargetStatus("red");
                  setBulkDialogOpen(true);
                }}
              >
                <XCircle className="h-4 w-4" />
                {t("adminAttendance.bulkRejectBtn")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                {t("common.clear")}
              </Button>
            </div>
          )}
        </div>
      )}

      {isPending && !data && <TableSkeleton columns={isSuperAdmin ? 7 : 6} rows={8} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && items.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={CalendarCheck}
            title={t("adminAttendance.emptyTitle")}
            description={
              queryFilters.assignment_id
                ? t("adminAttendance.emptyAssignment")
                : t("adminAttendance.emptyDefault")
            }
          />
        </div>
      )}

      {data && items.length > 0 && (
        <>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {isSuperAdmin && (
                    <TableHead className="w-[40px] px-2 text-center">
                      <input
                        type="checkbox"
                        checked={items.every((d) => selectedIds.has(d.id))}
                        onChange={toggleSelectAllVisible}
                        className="h-4 w-4 cursor-pointer rounded border-input accent-primary"
                        aria-label={t("common.selectAll")}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[120px]">{t("common.date")}</TableHead>
                  <TableHead>{t("common.student")}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t("adminAttendance.object")}
                  </TableHead>
                  <TableHead className="hidden w-[90px] sm:table-cell">
                    {t("adminAttendance.checkIn")}
                  </TableHead>
                  <TableHead className="hidden w-[90px] sm:table-cell">
                    {t("adminAttendance.checkOut")}
                  </TableHead>
                  <TableHead className="w-[110px]">{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((d) => (
                  <TableRow key={d.id} onClick={() => setSelected(d)} className="cursor-pointer">
                    {isSuperAdmin && (
                      <TableCell
                        className="w-[40px] px-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(d.id)}
                          onChange={() => toggleSelectRow(d.id)}
                          className="h-4 w-4 cursor-pointer rounded border-input accent-primary"
                          aria-label={`${d.date} ${d.student_full_name ?? ""}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-sm">
                      {/* Klaviatura uchun: qator bosilishi bilan bir xil amal */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(d);
                        }}
                        className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {d.date}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{d.student_full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.student_hemis_id}
                        <span className="md:hidden">
                          {" · "}
                          {d.organization_name ?? d.area_name ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {d.organization_name ?? d.area_name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-xs sm:table-cell">
                      {fmtTime(d.check_in_at)}
                    </TableCell>
                    <TableCell className="hidden text-xs sm:table-cell">
                      {fmtTime(d.check_out_at)}
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusBadge status={d.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <div>
              {t("common.total")}: <span className="font-medium text-foreground">{data.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
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
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages || isFetching}
              >
                {t("common.next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <DayDetailDialog day={selected} onClose={() => setSelected(null)} />
      <BulkOverrideDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        selectedIds={Array.from(selectedIds)}
        targetStatus={bulkTargetStatus}
        onSuccess={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
