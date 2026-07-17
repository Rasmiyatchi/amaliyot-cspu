import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
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
import { SelectEmpty } from "@/components/ui/empty-state";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAcademicYears,
  useCreateGroup,
  useDirections,
  useUpdateGroup,
} from "@/lib/api/academic";
import type { Group } from "@/lib/api/types";

const makeSchema = (t: TFunction) =>
  z.object({
    direction_id: z.string().uuid(t("academicGroupFormDialog.directionRequired")),
    academic_year_id: z.string().uuid(t("academicGroupFormDialog.yearRequired")),
    name: z.string().min(1).max(32),
    course: z.coerce.number().int().min(1).max(5),
  });

type Values = z.infer<ReturnType<typeof makeSchema>>;

type Props = { open: boolean; existing: Group | null; onClose: () => void };

export function GroupFormDialog({ open, existing, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateGroup();
  const update = useUpdateGroup();
  const directions = useDirections();
  const academicYears = useAcademicYears();
  const isEdit = !!existing;

  const form = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(makeSchema(t)) as any,
    defaultValues: {
      direction_id: "",
      academic_year_id: "",
      name: "",
      course: 1,
    },
  });

  useEffect(() => {
    if (open && existing) {
      form.reset({
        direction_id: existing.direction_id,
        academic_year_id: existing.academic_year_id,
        name: existing.name,
        course: existing.course,
      });
    } else if (open) {
      // yangi yaratishda — active AY ni avto-tanlash
      const activeAy = academicYears.data?.find((ay) => ay.is_active);
      form.reset({
        direction_id: "",
        academic_year_id: activeAy?.id ?? "",
        name: "",
        course: 1,
      });
    }
  }, [open, existing, form, academicYears.data]);

  const onSubmit = async (v: Values) => {
    try {
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, data: v });
        toast.success(t("academicGroupFormDialog.updated"));
      } else {
        await create.mutateAsync(v);
        toast.success(t("academicGroupFormDialog.created"));
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
              ? t("academicGroupFormDialog.editTitle")
              : t("academicGroupFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("academicGroupFormDialog.subtitle")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="direction_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.direction")} *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("academicGroupFormDialog.selectPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(directions.data?.items ?? []).length === 0 ? (
                        <SelectEmpty message={t("academicGroupFormDialog.noDirections")} />
                      ) : (
                        (directions.data?.items ?? []).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.code} — {d.name}
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
              name="academic_year_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.academicYear")} *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("academicGroupFormDialog.selectPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(academicYears.data ?? []).length === 0 ? (
                        <SelectEmpty message={t("academicGroupFormDialog.noYears")} />
                      ) : (
                        (academicYears.data ?? []).map((ay) => (
                          <SelectItem key={ay.id} value={ay.id}>
                            {ay.name}
                            {ay.is_active ? t("common.activeSuffix") : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("academicGroupFormDialog.groupName")} *</FormLabel>
                    <FormControl>
                      <Input placeholder="BIO-23/1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="course"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.course")} *</FormLabel>
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((c) => (
                          <SelectItem key={c} value={String(c)}>
                            {t("common.courseN", { n: c })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? t("common.save") : t("academicGroupFormDialog.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
