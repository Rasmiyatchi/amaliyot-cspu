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
import { SelectEmpty } from "@/components/ui/empty-state";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllFaculties, useCreateDepartment, useUpdateDepartment } from "@/lib/api/academic";
import type { Department } from "@/lib/api/types";

const makeSchema = (t: TFunction) =>
  z.object({
    faculty_id: z.string().min(1, t("academicDepartmentFormDialog.facultyRequired")),
    name: z
      .string()
      .trim()
      .min(2, t("adminValidation.minChars", { n: 2 }))
      .max(200, t("adminValidation.maxChars", { n: 200 })),
    code: z.string().trim().max(32, t("adminValidation.maxChars", { n: 32 })),
  });

type Values = z.infer<ReturnType<typeof makeSchema>>;

const EMPTY: Values = { faculty_id: "", name: "", code: "" };

type Props = { open: boolean; existing: Department | null; onClose: () => void };

export function DepartmentFormDialog({ open, existing, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const faculties = useAllFaculties();
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
        ? { faculty_id: existing.faculty_id, name: existing.name, code: existing.code ?? "" }
        : EMPTY,
    );
  }, [open, existing, form]);

  const onSubmit = async (v: Values) => {
    const payload = { faculty_id: v.faculty_id, name: v.name, code: v.code || null };
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, data: payload });
        toast.success(t("academicDepartmentFormDialog.updatedToast"));
      } else {
        await create.mutateAsync(payload);
        toast.success(t("academicDepartmentFormDialog.createdToast"));
      }
      onClose();
    } catch (e) {
      await applyServerFieldErrors(form, e);
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const busy = create.isPending || update.isPending;
  const facultyItems = faculties.data ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("academicDepartmentFormDialog.editTitle")
              : t("academicDepartmentFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("academicDepartmentFormDialog.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FormField
              control={form.control}
              name="faculty_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.faculty")} *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("academicDepartmentFormDialog.facultyPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {facultyItems.length === 0 ? (
                        <SelectEmpty message={t("academicDepartmentFormDialog.facultiesEmpty")} />
                      ) : (
                        facultyItems.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.name")} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("academicDepartmentFormDialog.namePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("academicDepartmentFormDialog.codeLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("academicDepartmentFormDialog.optionalPlaceholder")}
                      {...field}
                    />
                  </FormControl>
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
                {isEdit ? t("common.save") : t("academicDepartmentFormDialog.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
