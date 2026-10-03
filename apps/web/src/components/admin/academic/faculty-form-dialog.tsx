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
import { useCreateFaculty, useUpdateFaculty } from "@/lib/api/academic";
import type { Faculty } from "@/lib/api/types";

const makeSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, t("adminValidation.minChars", { n: 2 }))
      .max(200, t("adminValidation.maxChars", { n: 200 })),
    code: z.string().trim().max(16, t("adminValidation.maxChars", { n: 16 })),
  });

type Values = z.infer<ReturnType<typeof makeSchema>>;

type Props = { open: boolean; existing: Faculty | null; onClose: () => void };

export function FacultyFormDialog({ open, existing, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateFaculty();
  const update = useUpdateFaculty();
  const isEdit = !!existing;

  const schema = useMemo(() => makeSchema(t), [t]);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(existing ? { name: existing.name, code: existing.code ?? "" } : { name: "", code: "" });
  }, [open, existing, form]);

  const onSubmit = async (v: Values) => {
    const payload = { name: v.name, code: v.code || null };
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, data: payload });
        toast.success(t("academicFacultyFormDialog.updatedToast"));
      } else {
        await create.mutateAsync(payload);
        toast.success(t("academicFacultyFormDialog.createdToast"));
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
              ? t("academicFacultyFormDialog.editTitle")
              : t("academicFacultyFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("academicFacultyFormDialog.description")}</DialogDescription>
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
                    <Input
                      placeholder={t("academicFacultyFormDialog.namePlaceholder")}
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
                  <FormLabel>{t("academicFacultyFormDialog.codeLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("academicFacultyFormDialog.codePlaceholder")}
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
                {isEdit ? t("common.save") : t("academicFacultyFormDialog.createButton")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
