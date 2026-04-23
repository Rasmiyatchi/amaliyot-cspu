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
import { SelectEmpty } from "@/components/ui/empty-state";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDirection, useFaculties, useUpdateDirection } from "@/lib/api/academic";
import type { Direction } from "@/lib/api/types";

const schema = z.object({
  faculty_id: z.string().uuid("Fakultet tanlang"),
  code: z.string().regex(/^\d{8}$/, "8 raqamli HEMIS kod"),
  name: z.string().min(2).max(200),
});

type Values = z.infer<typeof schema>;

type Props = { open: boolean; existing: Direction | null; onClose: () => void };

export function DirectionFormDialog({ open, existing, onClose }: Props) {
  const create = useCreateDirection();
  const update = useUpdateDirection();
  const faculties = useFaculties();
  const isEdit = !!existing;

  const form = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { faculty_id: "", code: "", name: "" },
  });

  useEffect(() => {
    if (open && existing) {
      form.reset({
        faculty_id: existing.faculty_id,
        code: existing.code,
        name: existing.name,
      });
    } else if (open) {
      form.reset();
    }
  }, [open, existing, form]);

  const onSubmit = async (v: Values) => {
    try {
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, data: v });
        toast.success("Yo'nalish yangilandi");
      } else {
        await create.mutateAsync(v);
        toast.success("Yo'nalish yaratildi");
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
          <DialogTitle>
            {isEdit ? "Yo'nalishni tahrirlash" : "Yangi yo'nalish"}
          </DialogTitle>
          <DialogDescription>HEMIS yo'nalish kodi va nomi</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="faculty_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fakultet *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Fakultetni tanlang..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(faculties.data?.items ?? []).length === 0 ? (
                        <SelectEmpty message="Fakultetlar yo'q — avval qo'shing" />
                      ) : (
                        (faculties.data?.items ?? []).map((f) => (
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
                  <FormLabel>HEMIS kod *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="60110900"
                      maxLength={8}
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
                  <FormLabel>Nomi *</FormLabel>
                  <FormControl>
                    <Input placeholder="Biologiya" {...field} />
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
