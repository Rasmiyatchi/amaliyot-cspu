import { Download, KeyRound, Loader2, Plus, Trash2, Upload, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { HemisImportDialog } from "@/components/admin/students/hemis-import-dialog";
import { StudentDetailDialog } from "@/components/admin/students/student-detail-dialog";
import { StudentFormDialog } from "@/components/admin/students/student-form-dialog";
import { StudentsFilters } from "@/components/admin/students/students-filters";
import { StudentsTable } from "@/components/admin/students/students-table";
import { Button } from "@/components/ui/button";
import { downloadCredentialsExport, downloadExport } from "@/lib/api/exports";
import { useBulkDeleteStudents, type StudentFilters } from "@/lib/api/students";
import type { Student, UUID } from "@/lib/api/types";

export function StudentsPage() {
  const [filters, setFilters] = useState<StudentFilters>({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [credExporting, setCredExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bulkDelete = useBulkDeleteStudents();

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
    const ids = [...selectedIds];
    if (
      !confirm(
        `${ids.length} ta talabani o'chirishni tasdiqlaysizmi?\n\n` +
          "Amaliyot/topshiriq yozuvlari bor talabalar o'chmaydi — ular ro'yxatda qoladi.",
      )
    )
      return;
    try {
      const res = await bulkDelete.mutateAsync(ids as UUID[]);
      setSelectedIds(new Set());
      if (res.failed.length === 0) {
        toast.success(`${res.deleted} ta talaba o'chirildi`);
      } else {
        toast.warning(
          `${res.deleted} ta o'chirildi, ${res.failed.length} tasi o'chmadi ` +
            `(masalan: ${res.failed[0]?.full_name ?? "—"} — ${res.failed[0]?.error})`,
          { duration: 10000 },
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const handleFilterChange = (f: StudentFilters) => {
    setFilters(f);
    setPage(1); // filter o'zgarganda birinchi page'ga
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadExport("students", {
        faculty_id: filters.faculty_id,
        direction_id: filters.direction_id,
        group_id: filters.group_id,
        course: filters.course,
        academic_year_id: filters.academic_year_id,
        status: filters.status,
        search: filters.search,
      });
      toast.success("CSV yuklab olindi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setExporting(false);
    }
  };

  const handleCredentialsExport = async () => {
    setCredExporting(true);
    try {
      await downloadCredentialsExport({
        faculty_id: filters.faculty_id,
        direction_id: filters.direction_id,
        group_id: filters.group_id,
        course: filters.course,
        academic_year_id: filters.academic_year_id,
        status: filters.status,
        search: filters.search,
      });
      toast.success("Login/parol jadvali yuklab olindi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setCredExporting(false);
    }
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Talabalar</h1>
            <p className="text-sm text-muted-foreground">
              Excel'dan import, ro'yxat va tafsilotlar
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
            CSV eksport
          </Button>
          <Button
            variant="outline"
            onClick={handleCredentialsExport}
            disabled={credExporting}
            title="Filtrlangan talabalarning login va boshlang'ich parollari (Excel)"
          >
            {credExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Login/parol
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Excel Import
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Yangi talaba
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <StudentsFilters filters={filters} onChange={handleFilterChange} />
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm">
            <span className="font-medium">{selectedIds.size}</span> ta talaba tanlandi
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
            >
              {bulkDelete.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Tanlanganlarni o'chirish ({selectedIds.size})
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

      <StudentDetailDialog student={selected} onClose={() => setSelected(null)} />
      <HemisImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <StudentFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
