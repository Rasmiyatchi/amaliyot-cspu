import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StudentStatusBadge } from "@/components/admin/students/students-status-badge";
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
  const selectable = !!selectedIds && !!onToggleSelect && !!onTogglePage;

  if (q.isPending && !q.data) {
    return <TableSkeleton rows={8} columns={6} />;
  }
  if (q.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{q.error.message}</AlertDescription>
      </Alert>
    );
  }

  const data = q.data!;
  const pageIds = data.items.map((s) => s.id);
  const allOnPageSelected =
    selectable && pageIds.length > 0 && pageIds.every((id) => selectedIds!.has(id));
  const totalPages = Math.max(1, Math.ceil(data.total / data.page_size));
  const from = data.items.length === 0 ? 0 : (data.page - 1) * data.page_size + 1;
  const to = (data.page - 1) * data.page_size + data.items.length;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-[44px]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer"
                    aria-label={t("studentsStudentsTable.selectAllOnPage")}
                    checked={allOnPageSelected}
                    onChange={(e) => onTogglePage!(pageIds, e.target.checked)}
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
                  colSpan={selectable ? 6 : 5}
                  className="text-center text-muted-foreground"
                >
                  {t("studentsStudentsTable.empty")}
                </TableCell>
              </TableRow>
            )}
            {data.items.map((s) => (
              <TableRow
                key={s.id}
                onClick={() => onRowClick(s)}
                className="cursor-pointer"
              >
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer"
                      aria-label={t("studentsStudentsTable.selectRow")}
                      checked={selectedIds!.has(s.id)}
                      onChange={() => onToggleSelect!(s.id)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {s.last_name[0]}
                      {s.first_name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.full_name}</div>
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

      {data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">{from}–{to}</span> / {data.total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || q.isFetching}
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
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || q.isFetching}
            >
              {t("common.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
