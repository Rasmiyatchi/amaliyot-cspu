import { HTTPError } from "ky";
import { Download, KeyRound, Loader2, Plus, Trash2, Upload, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  BulkDeleteFailures,
  type BulkDeleteFailure,
} from "@/components/admin/students/bulk-delete-failures";
import { HemisImportDialog } from "@/components/admin/students/hemis-import-dialog";
import { StudentDetailDialog } from "@/components/admin/students/student-detail-dialog";
import { StudentFormDialog } from "@/components/admin/students/student-form-dialog";
import { StudentsFilters } from "@/components/admin/students/students-filters";
import { StudentsTable } from "@/components/admin/students/students-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { downloadCredentialsExport, downloadExport } from "@/lib/api/exports";
import { useBulkDeleteStudents, type StudentFilters } from "@/lib/api/students";
import type { Student, UUID } from "@/lib/api/types";

/** `?has_assignment=true|false` (dashboard havolalari) → filtr qiymati. */
function hasAssignmentFromParam(param: string | null): boolean | undefined {
  return param === null ? undefined : param === "true";
}

export function StudentsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasAssignmentParam = searchParams.get("has_assignment");
  const [filters, setFilters] = useState<StudentFilters>(() => {
    const hasAssignment = hasAssignmentFromParam(hasAssignmentParam);
    // ?search= — xabarlar sahifasidan ("Boshqa qurilmadan kirishga urinish") talaba kartasiga
    const search = searchParams.get("search")?.trim() || undefined;
    return {
      ...(hasAssignment === undefined ? {} : { has_assignment: hasAssignment }),
      ...(search ? { search } : {}),
    };
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // ⌘K tezkor amali — ?new=1: yaratish oynasi ochiladi, parametr URL'dan olib tashlanadi
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setCreateOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("new");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);
  const [exporting, setExporting] = useState(false);
  const [credExporting, setCredExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [failures, setFailures] = useState<BulkDeleteFailure[]>([]);
  const bulkDelete = useBulkDeleteStudents();

  // Sahifa ochiq turganda URL parametri o'zgarsa (masalan, dashboard havolasi yoki
  // sidebar orqali parametrsiz qaytish) — filtr moslanadi va 1-sahifaga qaytiladi.
  const [lastParam, setLastParam] = useState(hasAssignmentParam);
  if (hasAssignmentParam !== lastParam) {
    setLastParam(hasAssignmentParam);
    setFilters((prev) => ({ ...prev, has_assignment: hasAssignmentFromParam(hasAssignmentParam) }));
    setPage(1);
    setSelectedIds(new Set());
  }

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const togglePage = (ids: string[], checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const handleBulkDelete = async () => {
    const ids = [...selectedIds] as UUID[];
    if (ids.length === 0) return;
    try {
      const res = await bulkDelete.mutateAsync(ids);
      setConfirmBulk(false);
      setSelectedIds(new Set());
      // Amaliyot tarixi bor talabalar o'chmaydi (409) — har biri sababi bilan ko'rsatiladi
      setFailures(res.failed);
      if (res.failed.length === 0) {
        toast.success(t("adminStudents.bulkDeleted", { n: res.deleted }));
      } else {
        const first = res.failed[0];
        toast.warning(
          t("adminStudents.bulkDeletePartial", {
            deleted: res.deleted,
            failed: res.failed.length,
            name: first?.full_name ?? "—",
            error: first?.error ?? "",
          }),
          { duration: 10_000 },
        );
      }
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleFilterChange = (f: StudentFilters) => {
    setFilters(f);
    setPage(1); // filtr o'zgarganda birinchi sahifaga
    setSelectedIds(new Set()); // ko'rinmay qolgan qatorlar tasodifan o'chirilmasin
  };

  const exportParams = {
    faculty_id: filters.faculty_id,
    direction_id: filters.direction_id,
    group_id: filters.group_id,
    course: filters.course,
    academic_year_id: filters.academic_year_id,
    status: filters.status,
    search: filters.search,
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadExport("students", exportParams);
      toast.success(t("common.csvDownloaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setExporting(false);
    }
  };

  const handleCredentialsExport = async () => {
    setCredExporting(true);
    try {
      await downloadCredentialsExport(exportParams);
      toast.success(t("adminStudents.credentialsDownloaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setCredExporting(false);
    }
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">{t("common.students")}</h1>
            <p className="text-sm text-muted-foreground">{t("adminStudents.subtitle")}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t("adminStudents.csvExport")}
          </Button>
          <Button
            variant="outline"
            onClick={handleCredentialsExport}
            disabled={credExporting}
            title={t("adminStudents.credentialsTitle")}
          >
            {credExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {t("adminStudents.credentials")}
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            {t("adminStudents.excelImport")}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("adminStudents.newStudent")}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <StudentsFilters filters={filters} onChange={handleFilterChange} />
      </div>

      <BulkDeleteFailures failures={failures} onDismiss={() => setFailures([])} />

      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm">
            <Trans
              i18nKey="adminStudents.selectedCount"
              values={{ n: selectedIds.size }}
              components={[<span key="0" className="font-medium" />]}
            />
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmBulk(true)}
              disabled={bulkDelete.isPending}
            >
              {bulkDelete.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("adminStudents.deleteSelected", { n: selectedIds.size })}
            </Button>
          </div>
        </div>
      )}

      <StudentsTable
        filters={filters}
        page={page}
        onPageChange={setPage}
        onRowClick={setSelected}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onTogglePage={togglePage}
      />

      <StudentDetailDialog
        student={selected}
        onClose={() => setSelected(null)}
        onDeleted={(id) =>
          setSelectedIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          })
        }
      />
      <HemisImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <StudentFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConfirmDialog
        open={confirmBulk}
        title={t("adminStudents.bulkDeleteTitle")}
        description={
          <span className="whitespace-pre-line">
            {t("adminStudents.bulkDeleteConfirm", { n: selectedIds.size })}
          </span>
        }
        confirmText={t("common.delete")}
        variant="destructive"
        isPending={bulkDelete.isPending}
        onConfirm={handleBulkDelete}
        onClose={() => setConfirmBulk(false)}
      />
    </div>
  );
}
