import { HTTPError } from "ky";
import { Building, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { FacultyFormDialog } from "@/components/admin/academic/faculty-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dateLocale } from "@/i18n";
import { useAllFaculties, useDeleteFaculty } from "@/lib/api/academic";
import type { Faculty } from "@/lib/api/types";

type Props = {
  /** "Yangi fakultet" dialogi sahifa sarlavhasidagi tugma bilan boshqariladi */
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
};

export function FacultyList({ createOpen, onCreateOpenChange }: Props) {
  const { t } = useTranslation();
  const { data, isPending, error } = useAllFaculties();
  const del = useDeleteFaculty();
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [deleting, setDeleting] = useState<Faculty | null>(null);

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
      {isPending && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && data.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Building}
            title={t("academicFacultyList.emptyTitle")}
            description={t("academicFacultyList.emptyDescription")}
          />
        </div>
      )}

      {data && data.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{t("academicFacultyList.codeHeader")}</TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead className="w-[180px]">{t("academicFacultyList.createdHeader")}</TableHead>
                <TableHead className="w-[100px]">
                  <span className="sr-only">{t("common.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.code ?? "—"}</TableCell>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString(dateLocale())}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(f)}
                        aria-label={t("common.edit")}
                        title={t("common.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(f)}
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

      <FacultyFormDialog
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
        description={deleting ? t("academicFacultyList.deleteConfirm", { name: deleting.name }) : ""}
        confirmText={t("common.delete")}
        variant="destructive"
        isPending={del.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
