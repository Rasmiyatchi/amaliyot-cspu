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
import { useAllFaculties, useCreateDirection, useUpdateDirection } from "@/lib/api/academic";
import type { Direction } from "@/lib/api/types";

const makeSchema = (t: TFunction) =>
  z.object({
    faculty_id: z.string().min(1, t("academicDirectionFormDialog.facultyRequired")),
    code: z
      .string()
      .trim()
      .regex(/^\d{8}$/, t("academicDirectionFormDialog.codeInvalid")),
    name: z
      .string()
      .trim()
      .min(2, t("adminValidation.minChars", { n: 2 }))
      .max(200, t("adminValidation.maxChars", { n: 200 })),
  });

type Values = z.infer<ReturnType<typeof makeSchema>>;

const EMPTY: Values = { faculty_id: "", code: "", name: "" };

type Props = { open: boolean; existing: Direction | null; onClose: () => void };

export function DirectionFormDialog({ open, existing, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateDirection();
  const update = useUpdateDirection();
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
        ? { faculty_id: existing.faculty_id, code: existing.code, name: existing.name }
        : EMPTY,
    );
  }, [open, existing, form]);

  const onSubmit = async (v: Values) => {
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, data: v });
        toast.success(t("academicDirectionFormDialog.updatedToast"));
      } else {
        await create.mutateAsync(v);
        toast.success(t("academicDirectionFormDialog.createdToast"));
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
              ? t("academicDirectionFormDialog.editTitle")
              : t("academicDirectionFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("academicDirectionFormDialog.description")}</DialogDescription>
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
                        <SelectValue
                          placeholder={t("academicDirectionFormDialog.facultyPlaceholder")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {facultyItems.length === 0 ? (
                        <SelectEmpty message={t("academicDirectionFormDialog.facultiesEmpty")} />
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("academicDirectionFormDialog.codeLabel")} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="60110900"
                      maxLength={8}
                      inputMode="numeric"
                      className="font-mono"
                      {...field}
                    />
                  </FormControl>
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
                      placeholder={t("academicDirectionFormDialog.namePlaceholder")}
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
                {isEdit ? t("common.save") : t("academicDirectionFormDialog.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
