import { CalendarDays, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AcademicYearFormDialog } from "@/components/admin/academic/academic-year-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dateLocale } from "@/i18n";
import { useAcademicYears, useDeleteAcademicYear } from "@/lib/api/academic";
import type { AcademicYear } from "@/lib/api/types";

export function AcademicYearList() {
  const { t } = useTranslation();
  const { data, isPending, error } = useAcademicYears();
  const del = useDeleteAcademicYear();
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = async (ay: AcademicYear) => {
    if (!confirm(t("academicAcademicYearList.deleteConfirm", { name: ay.name }))) return;
    try {
      await del.mutateAsync(ay.id);
      toast.success(t("common.deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          {t("academicAcademicYearList.newYear")}
        </Button>
      </div>

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
            icon={CalendarDays}
            title={t("academicAcademicYearList.emptyTitle")}
            description={t("academicAcademicYearList.emptyDescription")}
          />
        </div>
      )}

      {data && data.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("academicAcademicYearList.colStart")}</TableHead>
                <TableHead>{t("academicAcademicYearList.colEnd")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((ay) => (
                <TableRow key={ay.id}>
                  <TableCell className="font-medium">{ay.name}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(ay.start_date).toLocaleDateString(dateLocale())}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(ay.end_date).toLocaleDateString(dateLocale())}
                  </TableCell>
                  <TableCell>
                    {ay.is_active ? (
                      <Badge variant="success">{t("academicAcademicYearList.active")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("academicAcademicYearList.archive")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(ay)} aria-label={t("common.edit")}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(ay)}
                        aria-label={t("common.delete")}
                        disabled={del.isPending}
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

      <AcademicYearFormDialog
        open={creating || !!editing}
        existing={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
