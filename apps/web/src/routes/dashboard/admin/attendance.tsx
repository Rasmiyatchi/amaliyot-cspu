import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { downloadExport } from "@/lib/api/exports";
import { useState } from "react";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
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
import { useAttendanceDays, type AttendanceFilters } from "@/lib/api/attendance";
import { useAssignments } from "@/lib/api/assignments";
import { useDirections, useFaculties, useGroups } from "@/lib/api/academic";
import { useAuthStore } from "@/stores/auth";
import type {
  AttendanceDay,
  AttendanceDayStatus,
  PracticeAssignment,
} from "@/lib/api/types";

const ALL = "__all__";

export function AttendancePage() {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === "super_admin";
  const [filters, setFilters] = useState<AttendanceFilters>({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AttendanceDay | null>(null);
  const [markRedFor, setMarkRedFor] = useState<PracticeAssignment | null>(null);
  const pageSize = 50;

  const { data, isPending, error, isFetching } = useAttendanceDays(filters, page, pageSize);

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

      {isPending && !data && <TableSkeleton columns={6} rows={8} />}
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
    </div>
  );
}
