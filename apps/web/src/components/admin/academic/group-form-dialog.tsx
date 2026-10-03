import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/admin/academic/searchable-select";
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
import {
  useAcademicYears,
  useAllDirections,
  useCreateGroup,
  useUpdateGroup,
} from "@/lib/api/academic";
import type { Group } from "@/lib/api/types";

const makeSchema = (t: TFunction) =>
  z.object({
    direction_id: z.string().min(1, t("academicGroupFormDialog.directionRequired")),
    academic_year_id: z.string().min(1, t("academicGroupFormDialog.yearRequired")),
    name: z
      .string()
      .trim()
      .min(1, t("adminValidation.required"))
      .max(32, t("adminValidation.maxChars", { n: 32 })),
    course: z.number().int().min(1).max(5),
  });

type Values = z.infer<ReturnType<typeof makeSchema>>;

type Props = { open: boolean; existing: Group | null; onClose: () => void };

export function GroupFormDialog({ open, existing, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateGroup();
  const update = useUpdateGroup();
  const directions = useAllDirections();
  const academicYears = useAcademicYears();
  const isEdit = !!existing;

  const schema = useMemo(() => makeSchema(t), [t]);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { direction_id: "", academic_year_id: "", name: "", course: 1 },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      existing
        ? {
            direction_id: existing.direction_id,
            academic_year_id: existing.academic_year_id,
            name: existing.name,
            course: existing.course,
          }
        : { direction_id: "", academic_year_id: "", name: "", course: 1 },
    );
  }, [open, existing, form]);

  // Yangi guruh: aktiv o'quv yilini avtomatik tanlash — o'quv yillari keyinroq yuklansa ham,
  // lekin foydalanuvchi tanlovini (yoki boshqa kiritilgan maydonlarni) qayta yozmasdan.
  const activeYearId = academicYears.data?.find((ay) => ay.is_active)?.id;
  useEffect(() => {
    if (!open || existing || !activeYearId) return;
    if (!form.getValues("academic_year_id")) form.setValue("academic_year_id", activeYearId);
  }, [open, existing, activeYearId, form]);

  const directionOptions: SearchableOption[] = useMemo(
    () => (directions.data ?? []).map((d) => ({ value: d.id, label: d.name, hint: d.code })),
    [directions.data],
  );

  const onSubmit = async (v: Values) => {
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, data: v });
        toast.success(t("academicGroupFormDialog.updated"));
      } else {
        await create.mutateAsync(v);
        toast.success(t("academicGroupFormDialog.created"));
      }
      onClose();
    } catch (e) {
      await applyServerFieldErrors(form, e);
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const busy = create.isPending || update.isPending;
  const years = academicYears.data ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FormField
              control={form.control}
              name="direction_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.direction")} *</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value || null}
                      onChange={(v) => field.onChange(v ?? "")}
                      options={directionOptions}
                      loading={directions.isPending}
                      placeholder={
                        !directions.isPending && directionOptions.length === 0
                          ? t("academicGroupFormDialog.noDirections")
                          : t("academicGroupFormDialog.selectPlaceholder")
                      }
                    />
                  </FormControl>
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
                      {years.length === 0 ? (
                        <SelectEmpty message={t("academicGroupFormDialog.noYears")} />
                      ) : (
                        years.map((ay) => (
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
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
