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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useOrganizations } from "@/lib/api/organizations";
import { useCreateSupervisor, useUpdateSupervisor } from "@/lib/api/supervisors";
import type { Supervisor } from "@/lib/api/types";

const NONE_VALUE = "__none__";

const supCreateSchema = z.object({
  username: z.string().min(3, "Kamida 3 ta belgi").max(64),
  password: z.string().min(8, "Kamida 8 ta belgi").max(128),
  email: z.string().email("Email noto'g'ri").optional().or(z.literal("")),
  phone: z.string().max(32).optional().or(z.literal("")),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  middle_name: z.string().max(100).optional().or(z.literal("")),
  position: z.string().min(2).max(100),
  specialty: z.string().max(150).optional().or(z.literal("")),
  experience_years: z.coerce.number().int().min(0).max(80).optional().or(z.literal(NaN as number)),
  organization_id: z.string().optional().or(z.literal(NONE_VALUE)),
  capacity: z.coerce.number().int().min(1).max(100),
});

type SupForm = z.infer<typeof supCreateSchema>;

const supUpdateSchema = supCreateSchema.partial();

type Props = {
  open: boolean;
  existing: Supervisor | null;
  onClose: () => void;
};

export function SupervisorFormDialog({ open, existing, onClose }: Props) {
  const create = useCreateSupervisor();
  const update = useUpdateSupervisor();
  const orgs = useOrganizations({}, 1, 100);
  const isEdit = !!existing;

  const form = useForm<SupForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver((isEdit ? supUpdateSchema : supCreateSchema) as any) as any,
    defaultValues: {
      username: "",
      password: "",
      email: "",
      phone: "",
      first_name: "",
      last_name: "",
      middle_name: "",
      position: "",
      specialty: "",
      organization_id: NONE_VALUE,
      capacity: 5,
    },
  });

  useEffect(() => {
    if (open && existing) {
      form.reset({
        username: existing.username,
        password: "",
        email: existing.email ?? "",
        phone: existing.phone ?? "",
        first_name: existing.first_name,
        last_name: existing.last_name,
        middle_name: existing.middle_name ?? "",
        position: existing.position,
        specialty: existing.specialty ?? "",
        experience_years: existing.experience_years ?? undefined,
        organization_id: existing.organization_id ?? NONE_VALUE,
        capacity: existing.capacity,
      });
    } else if (open) {
      form.reset();
    }
  }, [open, existing, form]);

  const onSubmit = async (values: SupForm) => {
    const orgId = values.organization_id === NONE_VALUE ? null : values.organization_id || null;
    const basePayload = {
      email: values.email || null,
      phone: values.phone || null,
      first_name: values.first_name,
      last_name: values.last_name,
      middle_name: values.middle_name || null,
      position: values.position,
      specialty: values.specialty || null,
      experience_years: Number.isFinite(values.experience_years) ? values.experience_years : null,
      organization_id: orgId,
      capacity: values.capacity,
    };

    try {
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, data: basePayload });
        toast.success("Supervizor yangilandi");
      } else {
        await create.mutateAsync({
          ...basePayload,
          username: values.username,
          password: values.password,
        } as never);
        toast.success("Supervizor yaratildi");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik yuz berdi");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Supervizorni tahrirlash" : "Yangi supervizor"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "User va profile ma'lumotlari birga yangilanadi"
              : "User (login + parol) va supervizor profili bir vaqtda yaratiladi"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Login credentials — faqat yangi yaratishda */}
            {!isEdit && (
              <>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Login ma'lumotlari
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username *</FormLabel>
                          <FormControl>
                            <Input autoComplete="off" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parol *</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Name + contact */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Shaxsiy ma'lumot
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Familiya *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ism *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="middle_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Otasining ismi (sharif)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Profile */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Kasbiy ma'lumot
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lavozim *</FormLabel>
                      <FormControl>
                        <Input placeholder="O'qituvchi, Direktor..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mutaxassislik</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experience_years"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tajriba (yil)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ""} />
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
                      <FormLabel>Sig'im (talabalar soni) *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="organization_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Tashkilot</FormLabel>
                      <Select value={field.value ?? NONE_VALUE} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tashkilot tanlang" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>Biriktirilmagan</SelectItem>
                          {(orgs.data?.items ?? []).map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
