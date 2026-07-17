import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

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
  z.object({
    name: z.string().regex(/^\d{4}-\d{4}$/, t("academicAcademicYearFormDialog.nameFormat")),
    start_date: z.string().min(1, t("academicAcademicYearFormDialog.dateRequired")),
    end_date: z.string().min(1, t("academicAcademicYearFormDialog.dateRequired")),
    is_active: z.boolean(),
  });

type Values = z.infer<ReturnType<typeof makeSchema>>;

type Props = { open: boolean; existing: AcademicYear | null; onClose: () => void };

export function AcademicYearFormDialog({ open, existing, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateAcademicYear();
  const update = useUpdateAcademicYear();
  const isEdit = !!existing;

  const schema = useMemo(() => makeSchema(t), [t]);

  const form = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: "",
      start_date: "",
      end_date: "",
      is_active: false,
    },
  });

  useEffect(() => {
    if (open && existing) {
      form.reset({
        name: existing.name,
        start_date: existing.start_date,
        end_date: existing.end_date,
        is_active: existing.is_active,
      });
    } else if (open) {
      form.reset();
    }
  }, [open, existing, form]);

  const onSubmit = async (v: Values) => {
    try {
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, data: v });
        toast.success(t("academicAcademicYearFormDialog.updatedToast"));
      } else {
        await create.mutateAsync(v);
        toast.success(t("academicAcademicYearFormDialog.createdToast"));
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("academicAcademicYearFormDialog.editTitle")
              : t("academicAcademicYearFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("academicAcademicYearFormDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <Input type="date" {...field} />
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
                <FormItem>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{t("academicAcademicYearFormDialog.isActive")}</span>
                  </label>
                  <FormMessage />
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
