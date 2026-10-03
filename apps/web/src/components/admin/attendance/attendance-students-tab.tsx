import { CalendarRange, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AttendanceSummaryFiltersBar } from "@/components/admin/attendance/attendance-summary-filters";
import { AttendanceSummaryTable } from "@/components/admin/attendance/attendance-summary-table";
import {
  RangeSetDialog,
  type RangeSetTarget,
} from "@/components/admin/attendance/range-set-dialog";
import { StudentAttendanceDialog } from "@/components/admin/attendance/student-attendance-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import { useDebounce } from "@/hooks/use-debounce";
import { useAttendanceSummary, type AttendanceSummaryFilters } from "@/lib/api/attendance";
import type { AttendanceSummaryRow } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

const PAGE_SIZE = 25;

type Props = {
  onOpenInDaysList?: (row: AttendanceSummaryRow) => void;
};

export function AttendanceStudentsTab({ onOpenInDaysList }: Props) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === "super_admin";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 350);
  const [filters, setFilters] = useState<AttendanceSummaryFilters>({ sort: "name" });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [openRow, setOpenRow] = useState<AttendanceSummaryRow | null>(null);
  const [rangeTarget, setRangeTarget] = useState<RangeSetTarget | null>(null);
  // Tanlangan qatorlar sahifalar o'rtasida ham saqlanadi — label uchun qatorlarni eslab qolamiz
  const [selectedRows, setSelectedRows] = useState<Map<string, AttendanceSummaryRow>>(
    () => new Map(),
  );

  const queryFilters: AttendanceSummaryFilters = {
    ...filters,
    search: debouncedSearch || undefined,
  };
  const { data, isPending, isFetching, error } = useAttendanceSummary(
    queryFilters,
    page,
    PAGE_SIZE,
  );
  const rows = data?.items ?? [];

  // Filtr yoki qidiruv o'zgarsa — 1-sahifa
  useEffect(() => {
    setPage(1);
  }, [filters, debouncedSearch]);

  const patchFilters = useCallback((patch: Partial<AttendanceSummaryFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = () => {
    setSearch("");
    setFilters({ sort: "name" });
  };

  const toggleRow = (id: string) => {
    const row = rows.find((r) => r.assignment_id === id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (row) {
      setSelectedRows((prev) => {
        const next = new Map(prev);
        if (next.has(id)) next.delete(id);
        else next.set(id, row);
        return next;
      });
    }
  };

  const toggleAllVisible = () => {
    const ids = rows.map((r) => r.assignment_id);
    const allOn = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
    setSelectedRows((prev) => {
      const next = new Map(prev);
      rows.forEach((r) => (allOn ? next.delete(r.assignment_id) : next.set(r.assignment_id, r)));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectedRows(new Map());
  };

  const openBulkRange = () => {
    const assignments = Array.from(selectedRows.values()).map((r) => ({
      assignment_id: r.assignment_id,
      label: r.student_full_name,
      start_date: r.start_date,
      end_date: r.end_date,
      required_weekdays: r.required_weekdays,
    }));
    if (assignments.length === 0) return;
    setRangeTarget({ kind: "multi", assignments });
  };

  // Dialog ochiq qator — jadval yangilansa yangi ma'lumot bilan
  const liveOpenRow = openRow
    ? (rows.find((r) => r.assignment_id === openRow.assignment_id) ?? openRow)
    : null;

  return (
    <div className="space-y-4">
      <AttendanceSummaryFiltersBar
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onChange={patchFilters}
        onReset={resetFilters}
      />

      {isSuperAdmin && rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <span className="text-sm font-medium">
            {t("adminAttendance.selectedStudents", {
              defaultValue: "Tanlangan: {{count}} ta talaba",
              count: selectedIds.size,
            })}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={openBulkRange} disabled={selectedIds.size === 0}>
              <CalendarRange className="h-4 w-4" />
              {t("adminAttendance.rangeForSelected", {
                defaultValue: "Tanlanganlar uchun oraliq belgilash",
              })}
            </Button>
            {selectedIds.size > 0 && (
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                {t("common.clear")}
              </Button>
            )}
          </div>
        </div>
      )}

      {isPending && !data && <TableSkeleton columns={isSuperAdmin ? 8 : 7} rows={8} />}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && rows.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Users}
            title={t("adminAttendance.noStudentsTitle", { defaultValue: "Talaba topilmadi" })}
            description={
              debouncedSearch
                ? t("adminAttendance.noStudentsSearch", {
                    defaultValue:
                      "«{{q}}» bo'yicha mos talaba yo'q. Qidiruvni yoki filtrlarni o'zgartiring.",
                    q: debouncedSearch,
                  })
                : t("adminAttendance.noStudentsDefault", {
                    defaultValue: "Filtrlarga mos aktiv biriktirish yo'q",
                  })
            }
          />
        </div>
      )}

      {data && rows.length > 0 && (
        <AttendanceSummaryTable
          rows={rows}
          total={data.total}
          page={page}
          pageSize={PAGE_SIZE}
          isFetching={isFetching}
          onPageChange={setPage}
          onRowClick={setOpenRow}
          selectable={isSuperAdmin}
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAllVisible={toggleAllVisible}
        />
      )}

      <StudentAttendanceDialog
        row={liveOpenRow}
        onClose={() => setOpenRow(null)}
        onOpenInDaysList={
          onOpenInDaysList
            ? (row) => {
                setOpenRow(null);
                onOpenInDaysList(row);
              }
            : undefined
        }
      />
      <RangeSetDialog
        target={rangeTarget}
        onClose={() => setRangeTarget(null)}
        onDone={clearSelection}
      />
    </div>
  );
}
