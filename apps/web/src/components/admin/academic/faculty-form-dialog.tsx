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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateFaculty, useUpdateFaculty } from "@/lib/api/academic";
import type { Faculty } from "@/lib/api/types";

const schema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().max(16).optional().or(z.literal("")),
});

type Values = z.infer<typeof schema>;

type Props = { open: boolean; existing: Faculty | null; onClose: () => void };

export function FacultyFormDialog({ open, existing, onClose }: Props) {
  const create = useCreateFaculty();
  const update = useUpdateFaculty();
  const isEdit = !!existing;

  const form = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { name: "", code: "" },
  });

  useEffect(() => {
    if (open && existing) {
      form.reset({ name: existing.name, code: existing.code ?? "" });
    } else if (open) {
      form.reset();
    }
  }, [open, existing, form]);

  const onSubmit = async (v: Values) => {
    const payload = { name: v.name, code: v.code || null };
    try {
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, data: payload });
        toast.success("Fakultet yangilandi");
      } else {
        await create.mutateAsync(payload);
        toast.success("Fakultet yaratildi");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Fakultetni tahrirlash" : "Yangi fakultet"}</DialogTitle>
          <DialogDescription>Pedagogika, Tabiiy fanlar va h.k.</DialogDescription>
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
                    <Input placeholder="Tabiiy fanlar fakulteti" {...field} />
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
                  <FormLabel>Qisqa kod</FormLabel>
                  <FormControl>
                    <Input placeholder="TF" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
