import {
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { BulkOverrideDialog } from "@/components/admin/attendance/bulk-override-dialog";
import { DayDetailDialog } from "@/components/admin/attendance/day-detail-dialog";
import { MarkRedDialog } from "@/components/admin/attendance/mark-red-dialog";
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
import { dateLocale } from "@/i18n";
import { useDirections, useFaculties, useGroups } from "@/lib/api/academic";
import { useAssignments } from "@/lib/api/assignments";
import { useAttendanceDays, type AttendanceFilters } from "@/lib/api/attendance";
import { downloadExport } from "@/lib/api/exports";
import type {
  AttendanceDay,
  AttendanceDayStatus,
  PracticeAssignment,
} from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

const ALL = "__all__";

export function AttendancePage() {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === "super_admin";
  const [filters, setFilters] = useState<AttendanceFilters>({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AttendanceDay | null>(null);
  const [markRedFor, setMarkRedFor] = useState<PracticeAssignment | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetStatus, setBulkTargetStatus] = useState<AttendanceDayStatus | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const pageSize = 50;

  const { data, isPending, error, isFetching } = useAttendanceDays(filters, page, pageSize);

  // Clear selection when filters or page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, page]);

  // Qidiruv menyusi uchun biriktirishlar (draft + active)
  const { data: assignmentsData } = useAssignments({}, 1, 100);
  const activeAssignments = (assignmentsData?.items ?? []).filter(
    (a) => a.status === "active" || a.status === "draft",
  );

  // Akademik filtrlar (kaskad: fakultet → yo'nalish → guruh)
  const faculties = useFaculties();
  const directions = useDirections(filters.faculty_id);
  const groups = useGroups({ directionId: filters.direction_id });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  const selectedAssignment = filters.assignment_id
    ? activeAssignments.find((a) => a.id === filters.assignment_id) ?? null
    : null;

  const items = data?.items ?? [];

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = items.map((d) => d.id);
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    if (allVisibleSelected) {
      const next = new Set(selectedIds);
      visibleIds.forEach((id) => next.delete(id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      visibleIds.forEach((id) => next.add(id));
      setSelectedIds(next);
    }
  };

  const selectByStatus = (status: AttendanceDayStatus) => {
    const matching = items.filter((d) => d.status === status).map((d) => d.id);
    setSelectedIds(new Set(matching));
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadExport("attendance", {
        assignment_id: filters.assignment_id,
        student_id: filters.student_id,
        status: filters.status,
        group_id: filters.group_id,
        direction_id: filters.direction_id,
        faculty_id: filters.faculty_id,
        date_from: filters.date_from,
        date_to: filters.date_to,
      });
      toast.success(t("common.csvDownloaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <CalendarCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("adminAttendance.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("adminAttendance.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t("adminAttendance.csvExport")}
          </Button>
          {selectedAssignment && isSuperAdmin && (
            <Button
              variant="destructive"
              onClick={() => setMarkRedFor(selectedAssignment)}
            >
              <XCircle className="h-4 w-4" />
              {t("adminAttendance.markRed")}
            </Button>
          )}
        </div>
      </div>

      {/* Super Admin uchun ommaviy tahrirlash paneli (Bulk Actions Bar) */}
      {isSuperAdmin && items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 shadow-xs transition-all">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">
              {t("adminAttendance.selectedCount", {
                defaultValue: "Tanlangan: {{count}} ta yozuv",
                count: selectedIds.size,
              })}
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">
                {t("common.quickSelect", { defaultValue: "Tezkor tanlash:" })}
              </span>
              <button
                type="button"
                onClick={() => selectByStatus("pending")}
                className="rounded bg-amber-100 px-2 py-0.5 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300 transition-colors cursor-pointer font-medium"
              >
                {t("adminAttendance.selectPending", { defaultValue: "Kutilayotganlar" })}
              </button>
              <button
                type="button"
                onClick={() => selectByStatus("red")}
                className="rounded bg-rose-100 px-2 py-0.5 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 transition-colors cursor-pointer font-medium"
              >
                {t("adminAttendance.selectRed", { defaultValue: "Qizillar" })}
              </button>
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="rounded bg-secondary px-2 py-0.5 text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer font-medium"
              >
                {t("common.selectAll", { defaultValue: "Sahifadagi barchasi" })}
              </button>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in-50">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setBulkTargetStatus("green");
                  setBulkDialogOpen(true);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("adminAttendance.bulkApproveBtn", { defaultValue: "Ommaviy tasdiqlash (Yashil)" })}
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
                {t("adminAttendance.bulkRejectBtn", { defaultValue: "Ommaviy rad etish (Qizil)" })}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                {t("common.clear", { defaultValue: "Tozalash" })}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Filtrlar */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="text-xs">{t("common.faculty")}</Label>
          <Select
            value={filters.faculty_id ?? ALL}
            onValueChange={(v) => {
              setFilters({
                ...filters,
                faculty_id: v === ALL ? undefined : v,
                direction_id: undefined,
                group_id: undefined,
              });
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.faculty")} />
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
          <Label className="text-xs">{t("common.direction")}</Label>
          <Select
            value={filters.direction_id ?? ALL}
            onValueChange={(v) => {
              setFilters({
                ...filters,
                direction_id: v === ALL ? undefined : v,
                group_id: undefined,
              });
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.direction")} />
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
          <Label className="text-xs">{t("common.group")}</Label>
          <Select
            value={filters.group_id ?? ALL}
            onValueChange={(v) => {
              setFilters({ ...filters, group_id: v === ALL ? undefined : v });
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.group")} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>{t("adminAttendance.allGroups")}</SelectItem>
              {(groups.data?.items ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name} ({t("common.courseN", { n: g.course })})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t("adminAttendance.assignment")}</Label>
          <Select
            value={filters.assignment_id ?? ALL}
            onValueChange={(v) => {
              setFilters({
                ...filters,
                assignment_id: v === ALL ? undefined : v,
              });
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("adminAttendance.assignmentPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>{t("adminAttendance.allAssignments")}</SelectItem>
              {activeAssignments.length === 0 && (
                <SelectItem value="__empty__" disabled>
                  {t("adminAttendance.noActiveAssignments")}
                </SelectItem>
              )}
              {activeAssignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.student_full_name} · {a.organization_name ?? a.area_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t("common.status")}</Label>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(v) => {
              setFilters({
                ...filters,
                status: v === ALL ? undefined : (v as AttendanceDayStatus),
              });
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.status")} />
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
          <Label className="text-xs">{t("adminAttendance.dateFrom")}</Label>
          <Input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) => {
              setFilters({ ...filters, date_from: e.target.value || undefined });
              setPage(1);
            }}
          />
        </div>

        <div>
          <Label className="text-xs">{t("adminAttendance.dateTo")}</Label>
          <Input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) => {
              setFilters({ ...filters, date_to: e.target.value || undefined });
              setPage(1);
            }}
          />
        </div>

        <div className="flex items-end">
          {(filters.assignment_id ||
            filters.status ||
            filters.date_from ||
            filters.date_to ||
            filters.faculty_id ||
            filters.direction_id ||
            filters.group_id) && (
            <Button
              variant="outline"
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
            >
              {t("common.clear")}
            </Button>
          )}
        </div>
      </div>

      {isPending && !data && <TableSkeleton columns={isSuperAdmin ? 7 : 6} rows={8} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={CalendarCheck}
            title={t("adminAttendance.emptyTitle")}
            description={
              filters.assignment_id
                ? t("adminAttendance.emptyAssignment")
                : t("adminAttendance.emptyDefault")
            }
          />
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {isSuperAdmin && (
                    <TableHead className="w-[40px] px-2 text-center">
                      <input
                        type="checkbox"
                        checked={
                          items.length > 0 && items.every((d) => selectedIds.has(d.id))
                        }
                        onChange={toggleSelectAllVisible}
                        className="h-4 w-4 rounded border-input cursor-pointer accent-primary"
                        title={t("common.selectAll", { defaultValue: "Barchasini tanlash" })}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[120px]">{t("common.date")}</TableHead>
                  <TableHead>{t("common.student")}</TableHead>
                  <TableHead>{t("adminAttendance.object")}</TableHead>
                  <TableHead className="w-[100px]">{t("adminAttendance.checkIn")}</TableHead>
                  <TableHead className="w-[100px]">{t("adminAttendance.checkOut")}</TableHead>
                  <TableHead className="w-[120px]">{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((d) => (
                  <TableRow
                    key={d.id}
                    onClick={() => setSelected(d)}
                    className="cursor-pointer"
                  >
                    {isSuperAdmin && (
                      <TableCell
                        className="w-[40px] px-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(d.id)}
                          onChange={() => toggleSelectRow(d.id)}
                          className="h-4 w-4 rounded border-input cursor-pointer accent-primary"
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-sm">{d.date}</TableCell>
                    <TableCell>
                      <div className="font-medium">{d.student_full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.student_hemis_id}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.organization_name ?? d.area_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.check_in_at
                        ? new Date(d.check_in_at).toLocaleTimeString(dateLocale(), {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.check_out_at
                        ? new Date(d.check_out_at).toLocaleTimeString(dateLocale(), {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusBadge status={d.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data.total > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
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
                <span className="px-2">
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
          )}
        </>
      )}

      <DayDetailDialog day={selected} onClose={() => setSelected(null)} />
      <MarkRedDialog
        assignment={markRedFor}
        onClose={() => setMarkRedFor(null)}
      />
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
