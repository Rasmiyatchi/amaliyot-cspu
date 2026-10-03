import { useTranslation } from "react-i18next";

import { ListPagination } from "@/components/admin/students/list-pagination";
import { StudentStatusBadge } from "@/components/admin/students/students-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStudents, type StudentFilters } from "@/lib/api/students";
import type { Student } from "@/lib/api/types";

type Props = {
  filters: StudentFilters;
  page: number;
  onPageChange: (page: number) => void;
  onRowClick: (student: Student) => void;
  pageSize?: number;
  /** Ko'p tanlab o'chirish uchun — berilmasa checkbox ustuni ko'rinmaydi */
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onTogglePage?: (ids: string[], checked: boolean) => void;
};

export function StudentsTable({
  filters,
  page,
  onPageChange,
  onRowClick,
  pageSize = 20,
  selectedIds,
  onToggleSelect,
  onTogglePage,
}: Props) {
  const { t } = useTranslation();
  const q = useStudents(filters, page, pageSize);
  const selection =
    selectedIds && onToggleSelect && onTogglePage
      ? { selectedIds, onToggleSelect, onTogglePage }
      : null;

  if (q.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{q.error.message}</AlertDescription>
      </Alert>
    );
  }
  if (!q.data) {
    return <TableSkeleton rows={8} columns={6} />;
  }

  const data = q.data;
  const pageIds = data.items.map((s) => s.id);
  const selectedOnPage = selection
    ? pageIds.filter((id) => selection.selectedIds.has(id)).length
    : 0;
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {selection && (
                <TableHead className="w-[44px]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-primary"
                    aria-label={t("studentsStudentsTable.selectAllOnPage")}
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedOnPage > 0 && !allOnPageSelected;
                    }}
                    disabled={pageIds.length === 0}
                    onChange={(e) => selection.onTogglePage(pageIds, e.target.checked)}
                  />
                </TableHead>
              )}
              <TableHead className="w-[280px]">{t("common.student")}</TableHead>
              <TableHead>{t("common.direction")}</TableHead>
              <TableHead className="w-[120px]">{t("common.group")}</TableHead>
              <TableHead>{t("studentsStudentsTable.region")}</TableHead>
              <TableHead className="w-[140px]">{t("common.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={selection ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("studentsStudentsTable.empty")}
                </TableCell>
              </TableRow>
            )}
            {data.items.map((s) => (
              <TableRow key={s.id} onClick={() => onRowClick(s)} className="cursor-pointer">
                {selection && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-primary"
                      aria-label={t("studentsStudentsTable.selectRowNamed", { name: s.full_name })}
                      checked={selection.selectedIds.has(s.id)}
                      onChange={() => selection.onToggleSelect(s.id)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
                      aria-hidden="true"
                    >
                      {s.last_name.charAt(0)}
                      {s.first_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      {/* Klaviatura bilan ham ochilsin: qator bosilishi bilan bir xil */}
                      <button
                        type="button"
                        className="block max-w-full truncate text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(s);
                        }}
                      >
                        {s.full_name}
                      </button>
                      <div className="text-xs text-muted-foreground">
                        {s.hemis_id}
                        {s.phone ? ` · ${s.phone}` : ""}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {s.direction_code ? (
                    <div>
                      <Badge variant="secondary" className="mb-1 font-mono text-xs">
                        {s.direction_code}
                      </Badge>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.direction_name}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {s.group_name ? (
                    <div className="text-sm">
                      {s.group_name}
                      {s.course ? (
                        <div className="text-xs text-muted-foreground">
                          {t("common.courseN", { n: s.course })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {s.region ?? "—"}
                  {s.district ? (
                    <div className="text-xs text-muted-foreground">{s.district}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StudentStatusBadge status={s.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        page={page}
        pageSize={pageSize}
        total={data.total}
        onPageChange={onPageChange}
        disabled={q.isFetching}
      />
    </div>
  );
}
