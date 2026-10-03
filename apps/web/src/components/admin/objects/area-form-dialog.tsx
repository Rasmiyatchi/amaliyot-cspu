import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Switch } from "@/components/admin/objects/switch";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MapPicker } from "@/components/ui/map-picker";
import { useCreateArea, useUpdateArea } from "@/lib/api/areas";
import type { Area, AreaCreate } from "@/lib/api/types";

const intInRange = (value: string, min: number, max: number) =>
  /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max;

const makeSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, t("adminValidation.minChars", { n: 2 }))
      .max(200, t("adminValidation.maxChars", { n: 200 })),
    description: z.string().trim(),
    region: z
      .string()
      .trim()
      .min(2, t("adminValidation.minChars", { n: 2 }))
      .max(64, t("adminValidation.maxChars", { n: 64 })),
    district: z.string().trim().max(64, t("adminValidation.maxChars", { n: 64 })),
    capacity: z
      .string()
      .trim()
      .refine((v) => intInRange(v, 1, 1000), {
        message: t("adminValidation.intRange", { min: 1, max: 1000 }),
      }),
    geo: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    is_active: z.boolean(),
  });

type AreaForm = z.infer<ReturnType<typeof makeSchema>>;

const EMPTY: AreaForm = {
  name: "",
  description: "",
  region: "",
  district: "",
  capacity: "30",
  geo: null,
  is_active: true,
};

/** API Decimal'ni satr ko'rinishida qaytarishi mumkin ("41.311") */
function toCoord(value: number | string | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toFormValues(existing: Area): AreaForm {
  const lat = toCoord(existing.geo_lat);
  const lng = toCoord(existing.geo_lng);
  return {
    name: existing.name,
    description: existing.description ?? "",
    region: existing.region,
    district: existing.district ?? "",
    capacity: String(existing.capacity),
    geo: lat !== null && lng !== null ? { lat, lng } : null,
    is_active: existing.is_active,
  };
}

type Props = {
  open: boolean;
  existing: Area | null;
  onClose: () => void;
};

export function AreaFormDialog({ open, existing, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateArea();
  const update = useUpdateArea();
  const isEdit = !!existing;
  const formId = useId();

  const schema = useMemo(() => makeSchema(t), [t]);
  const form = useForm<AreaForm>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(existing ? toFormValues(existing) : EMPTY);
  }, [open, existing, form]);

  const onSubmit = async (v: AreaForm) => {
    const payload: Partial<AreaCreate> = {
      name: v.name,
      description: v.description || null,
      region: v.region,
      district: v.district || null,
      geo_lat: v.geo?.lat ?? null,
      geo_lng: v.geo?.lng ?? null,
      capacity: Number(v.capacity),
      is_active: v.is_active,
    };
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, data: payload });
        toast.success(t("objectsAreaFormDialog.areaUpdated"));
      } else {
        await create.mutateAsync(payload);
        toast.success(t("objectsAreaFormDialog.areaCreated"));
      }
      onClose();
    } catch (e) {
      await applyServerFieldErrors(form, e);
      toast.error(e instanceof HTTPError ? e.message : t("common.unexpectedError"));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("objectsAreaFormDialog.editTitle") : t("objectsAreaFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("objectsAreaFormDialog.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.name")} *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("objectsAreaFormDialog.namePlaceholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("objectsAreaFormDialog.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("objectsAreaFormDialog.region")} *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("objectsAreaFormDialog.district")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("objectsAreaFormDialog.capacity")} *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" inputMode="numeric" min={1} max={1000} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex h-full items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div className="min-w-0 space-y-0.5">
                        <FormLabel>{t("objectsAreaFormDialog.isActive")}</FormLabel>
                        <FormDescription>{t("objectsAreaFormDialog.isActiveHint")}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="geo"
              render={({ field }) => (
                <FormItem>
                  <div className="text-sm font-medium">{t("objectsAreaFormDialog.mapLocation")}</div>
                  <MapPicker
                    value={field.value}
                    onChange={field.onChange}
                    onClear={() => field.onChange(null)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form={formId} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? t("common.save") : t("objectsAreaFormDialog.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
