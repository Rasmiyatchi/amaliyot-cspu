import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerFieldErrors } from "@/components/admin/students/server-field-errors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateAcademicYear, useUpdateAcademicYear } from "@/lib/api/academic";
import type { AcademicYear } from "@/lib/api/types";

const makeSchema = (t: TFunction) =>
  z
    .object({
      name: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{4}$/, t("academicAcademicYearFormDialog.nameFormat")),
      start_date: z.string().min(1, t("academicAcademicYearFormDialog.dateRequired")),
      end_date: z.string().min(1, t("academicAcademicYearFormDialog.dateRequired")),
      is_active: z.boolean(),
    })
    // "YYYY-MM-DD" satrlari leksikografik tartibda sana tartibiga mos keladi
    .refine((v) => !v.start_date || !v.end_date || v.end_date > v.start_date, {
      path: ["end_date"],
      message: t("academicAcademicYearFormDialog.endBeforeStart"),
    });

type Values = z.infer<ReturnType<typeof makeSchema>>;

const EMPTY: Values = { name: "", start_date: "", end_date: "", is_active: false };

type Props = { open: boolean; existing: AcademicYear | null; onClose: () => void };

export function AcademicYearFormDialog({ open, existing, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateAcademicYear();
  const update = useUpdateAcademicYear();
  const isEdit = !!existing;

  const schema = useMemo(() => makeSchema(t), [t]);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      existing
        ? {
            name: existing.name,
            start_date: existing.start_date,
            end_date: existing.end_date,
            is_active: existing.is_active,
          }
        : EMPTY,
    );
  }, [open, existing, form]);

  const startDate = form.watch("start_date");

  const onSubmit = async (v: Values) => {
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, data: v });
        toast.success(t("academicAcademicYearFormDialog.updatedToast"));
      } else {
        await create.mutateAsync(v);
        toast.success(t("academicAcademicYearFormDialog.createdToast"));
      }
      onClose();
    } catch (e) {
      await applyServerFieldErrors(form, e);
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("academicAcademicYearFormDialog.editTitle")
              : t("academicAcademicYearFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("academicAcademicYearFormDialog.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.name")} *</FormLabel>
                  <FormControl>
                    <Input placeholder="2025-2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("academicAcademicYearFormDialog.startDate")} *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("academicAcademicYearFormDialog.endDate")} *</FormLabel>
                    <FormControl>
                      <Input type="date" min={startDate || undefined} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-primary"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    {t("academicAcademicYearFormDialog.isActive")}
                  </FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? t("common.save") : t("academicAcademicYearFormDialog.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
