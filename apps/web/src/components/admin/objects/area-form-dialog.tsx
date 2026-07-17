import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MapPicker } from "@/components/ui/map-picker";
import { useCreateArea, useUpdateArea } from "@/lib/api/areas";
import type { Area } from "@/lib/api/types";

const areaSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional().or(z.literal("")),
  region: z.string().min(2).max(64),
  district: z.string().max(64).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(1000),
});

type AreaForm = z.infer<typeof areaSchema>;

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

  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  const form = useForm<AreaForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(areaSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      region: "",
      district: "",
      capacity: 30,
    },
  });

  useEffect(() => {
    if (open && existing) {
      form.reset({
        name: existing.name,
        description: existing.description ?? "",
        region: existing.region,
        district: existing.district ?? "",
        capacity: existing.capacity,
      });
      setGeo(
        existing.geo_lat && existing.geo_lng
          ? { lat: Number(existing.geo_lat), lng: Number(existing.geo_lng) }
          : null,
      );
    } else if (open) {
      form.reset();
      setGeo(null);
    }
  }, [open, existing, form]);

  const onSubmit = async (values: AreaForm) => {
    const payload: Partial<Area> = {
      name: values.name,
      description: values.description || null,
      region: values.region,
      district: values.district || null,
      geo_lat: geo?.lat ?? null,
      geo_lng: geo?.lng ?? null,
      capacity: values.capacity,
    };
    try {
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, data: payload });
        toast.success(t("objectsAreaFormDialog.areaUpdated"));
      } else {
        await create.mutateAsync(payload);
        toast.success(t("objectsAreaFormDialog.areaCreated"));
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.unexpectedError"));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("objectsAreaFormDialog.editTitle") : t("objectsAreaFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("objectsAreaFormDialog.description")}
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
                    <Input placeholder={t("objectsAreaFormDialog.namePlaceholder")} {...field} />
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
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("objectsAreaFormDialog.capacity")} *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("objectsAreaFormDialog.mapLocation")}</label>
              <MapPicker value={geo} onChange={setGeo} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? t("common.save") : t("objectsAreaFormDialog.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
