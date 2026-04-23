import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { useCreateArea, useUpdateArea } from "@/lib/api/areas";
import type { Area } from "@/lib/api/types";

const areaSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional().or(z.literal("")),
  region: z.string().min(2).max(64),
  district: z.string().max(64).optional().or(z.literal("")),
  geo_lat: z.coerce.number().min(-90).max(90).optional().or(z.literal(NaN as number)),
  geo_lng: z.coerce.number().min(-180).max(180).optional().or(z.literal(NaN as number)),
  capacity: z.coerce.number().int().min(1).max(1000),
});

type AreaForm = z.infer<typeof areaSchema>;

type Props = {
  open: boolean;
  existing: Area | null;
  onClose: () => void;
};

export function AreaFormDialog({ open, existing, onClose }: Props) {
  const create = useCreateArea();
  const update = useUpdateArea();
  const isEdit = !!existing;

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
        geo_lat: existing.geo_lat ?? undefined,
        geo_lng: existing.geo_lng ?? undefined,
        capacity: existing.capacity,
      });
    } else if (open) {
      form.reset();
    }
  }, [open, existing, form]);

  const onSubmit = async (values: AreaForm) => {
    const payload: Partial<Area> = {
      name: values.name,
      description: values.description || null,
      region: values.region,
      district: values.district || null,
      geo_lat: Number.isFinite(values.geo_lat) ? values.geo_lat : null,
      geo_lng: Number.isFinite(values.geo_lng) ? values.geo_lng : null,
      capacity: values.capacity,
    };
    try {
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, data: payload });
        toast.success("Hudud yangilandi");
      } else {
        await create.mutateAsync(payload);
        toast.success("Hudud yaratildi");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik yuz berdi");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Hududni tahrirlash" : "Yangi hudud"}</DialogTitle>
          <DialogDescription>
            Dala/zoologiya/botanika amaliyoti uchun (shartnomasiz)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomi *</FormLabel>
                  <FormControl>
                    <Input placeholder="Chimyon togʻi" {...field} />
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
                  <FormLabel>Tavsif</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Viloyat *</FormLabel>
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
                    <FormLabel>Tuman</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="geo_lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lat</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0000001"
                        placeholder="41.2"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="geo_lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lng</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0000001"
                        placeholder="70.3"
                        {...field}
                        value={field.value ?? ""}
                      />
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
                    <FormLabel>Sig'imi (talabalar) *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Saqlash" : "Yaratish"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
