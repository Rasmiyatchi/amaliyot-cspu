import { Upload, Users } from "lucide-react";
import { useState } from "react";

import { HemisImportDialog } from "@/components/admin/students/hemis-import-dialog";
import { StudentDetailDialog } from "@/components/admin/students/student-detail-dialog";
import { StudentsFilters } from "@/components/admin/students/students-filters";
import { StudentsTable } from "@/components/admin/students/students-table";
import { Button } from "@/components/ui/button";
import type { StudentFilters } from "@/lib/api/students";
import type { Student } from "@/lib/api/types";

export function StudentsPage() {
  const [filters, setFilters] = useState<StudentFilters>({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleFilterChange = (f: StudentFilters) => {
    setFilters(f);
    setPage(1); // filter o'zgarganda birinchi page'ga
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
              HEMIS'dan import, ro'yxat va tafsilotlar
            </p>
          </div>
        </div>

        <Button onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" />
          HEMIS Import
        </Button>
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
    </div>
  );
}
