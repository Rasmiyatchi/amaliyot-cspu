import { HTTPError } from "ky";
import { CalendarDays, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AcademicYearFormDialog } from "@/components/admin/academic/academic-year-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dateLocale } from "@/i18n";
import { useAcademicYears, useDeleteAcademicYear } from "@/lib/api/academic";
import type { AcademicYear, ISODate } from "@/lib/api/types";

/** "YYYY-MM-DD" — vaqt mintaqasiz sana: UTC'da formatlaymiz, aks holda kun siljishi mumkin. */
function formatIsoDate(date: ISODate): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(dateLocale(), { timeZone: "UTC" });
}

type Props = {
  /** "Yangi o'quv yili" dialogi sahifa sarlavhasidagi tugma bilan boshqariladi */
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
};

export function AcademicYearList({ createOpen, onCreateOpenChange }: Props) {
  const { t } = useTranslation();
  const { data, isPending, error } = useAcademicYears();
  const del = useDeleteAcademicYear();
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [deleting, setDeleting] = useState<AcademicYear | null>(null);

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
                <TableHead className="w-[100px]">
                  <span className="sr-only">{t("common.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((ay) => (
                <TableRow key={ay.id}>
                  <TableCell className="font-medium">{ay.name}</TableCell>
                  <TableCell className="text-sm">{formatIsoDate(ay.start_date)}</TableCell>
                  <TableCell className="text-sm">{formatIsoDate(ay.end_date)}</TableCell>
                  <TableCell>
                    {ay.is_active ? (
                      <Badge variant="success">{t("academicAcademicYearList.active")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("academicAcademicYearList.archive")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(ay)}
                        aria-label={t("common.edit")}
                        title={t("common.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(ay)}
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

      <AcademicYearFormDialog
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
          deleting ? t("academicAcademicYearList.deleteConfirm", { name: deleting.name }) : ""
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
