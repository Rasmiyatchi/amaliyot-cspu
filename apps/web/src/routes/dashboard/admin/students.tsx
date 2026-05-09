import { Download, Loader2, Plus, Upload, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { HemisImportDialog } from "@/components/admin/students/hemis-import-dialog";
import { StudentDetailDialog } from "@/components/admin/students/student-detail-dialog";
import { StudentFormDialog } from "@/components/admin/students/student-form-dialog";
import { StudentsFilters } from "@/components/admin/students/students-filters";
import { StudentsTable } from "@/components/admin/students/students-table";
import { Button } from "@/components/ui/button";
import { downloadExport } from "@/lib/api/exports";
import type { StudentFilters } from "@/lib/api/students";
import type { Student } from "@/lib/api/types";

export function StudentsPage() {
  const [filters, setFilters] = useState<StudentFilters>({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
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

      <StudentsTable
        filters={filters}
        page={page}
        onPageChange={setPage}
        onRowClick={setSelected}
      />

      <StudentDetailDialog student={selected} onClose={() => setSelected(null)} />
      <HemisImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <StudentFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
