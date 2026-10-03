import { HTTPError } from "ky";
import { Building2, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DepartmentFormDialog } from "@/components/admin/academic/department-form-dialog";
import { ListPagination } from "@/components/admin/students/list-pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllFaculties, useDeleteDepartment, useDepartments } from "@/lib/api/academic";
import type { Department, UUID } from "@/lib/api/types";

const ALL = "__all__";
const PAGE_SIZE = 50;

type Props = {
  /** "Yangi kafedra" dialogi sahifa sarlavhasidagi tugma bilan boshqariladi */
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
};

export function DepartmentList({ createOpen, onCreateOpenChange }: Props) {
  const { t } = useTranslation();
  const faculties = useAllFaculties();
  const [facultyId, setFacultyId] = useState<UUID | undefined>(undefined);
  const [page, setPage] = useState(1);
  const departments = useDepartments(facultyId, page, PAGE_SIZE, { keepPrevious: true });
  const del = useDeleteDepartment();
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const facultyById = new Map((faculties.data ?? []).map((f) => [f.id, f]));
  const items = departments.data?.items ?? [];

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success(t("common.deleted"));
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"), { duration: 8000 });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={facultyId ?? ALL}
          onValueChange={(v) => {
            setFacultyId(v === ALL ? undefined : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[240px]" aria-label={t("common.faculty")}>
            <SelectValue placeholder={t("common.faculty")} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value={ALL}>{t("academicDepartmentList.allFaculties")}</SelectItem>
            {(faculties.data ?? []).map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {departments.isPending && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {departments.error && (
        <Alert variant="destructive">
          <AlertDescription>{departments.error.message}</AlertDescription>
        </Alert>
      )}

      {departments.data && items.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Building2}
            title={t("academicDepartmentList.emptyTitle")}
            description={t("academicDepartmentList.emptyDescription")}
          />
        </div>
      )}

      {departments.data && items.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead className="w-[120px]">{t("academicDepartmentList.code")}</TableHead>
                <TableHead>{t("common.faculty")}</TableHead>
                <TableHead className="w-[100px]">
                  <span className="sr-only">{t("common.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>
                    {d.code ? (
                      <Badge variant="secondary" className="font-mono">
                        {d.code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {facultyById.get(d.faculty_id)?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(d)}
                        aria-label={t("common.edit")}
                        title={t("common.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(d)}
                        aria-label={t("common.delete")}
                        title={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {departments.data && (
        <ListPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={departments.data.total}
          onPageChange={setPage}
          disabled={departments.isFetching}
        />
      )}

      <DepartmentFormDialog
        open={createOpen || !!editing}
        existing={editing}
        onClose={() => {
          onCreateOpenChange(false);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title={t("adminStructure.deleteTitle")}
        description={
          deleting ? t("academicDepartmentList.deleteConfirm", { name: deleting.name }) : ""
        }
        confirmText={t("common.delete")}
        variant="destructive"
        isPending={del.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
