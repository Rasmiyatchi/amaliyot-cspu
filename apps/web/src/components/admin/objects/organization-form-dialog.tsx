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
import { useCreateOrganization, useUpdateOrganization } from "@/lib/api/organizations";
import type { Organization, OrganizationKind } from "@/lib/api/types";

const KIND_OPTIONS: { value: OrganizationKind; label: string }[] = [
  { value: "school", label: "Maktab" },
  { value: "mtt", label: "MTT (bog'cha)" },
  { value: "lyceum", label: "Akademik litsey" },
  { value: "college", label: "Kasb-hunar kolleji" },
  { value: "company", label: "Korxona" },
  { value: "university", label: "Universitet" },
  { value: "other", label: "Boshqa" },
];

const orgSchema = z.object({
  name: z.string().min(2, "Kamida 2 ta belgi").max(200),
  legal_name: z.string().max(300).optional().or(z.literal("")),
  kind: z.enum(["school", "mtt", "lyceum", "college", "company", "university", "other"]),
  director_full_name: z.string().min(3, "F.I.SH. to'liq kiriting").max(200),
  director_position: z.string().max(100).optional().or(z.literal("")),
  region: z.string().min(2).max(64),
  district: z.string().max(64).optional().or(z.literal("")),
  address_line: z.string().min(3).max(300),
  phone: z.string().min(5).max(32),
  email: z.string().email("Email noto'g'ri").optional().or(z.literal("")),
  website: z.string().max(255).optional().or(z.literal("")),
  inn: z.string().max(16).optional().or(z.literal("")),
  bank_name: z.string().max(200).optional().or(z.literal("")),
  bank_account: z.string().max(32).optional().or(z.literal("")),
  bank_correspondent: z.string().max(32).optional().or(z.literal("")),
  bank_mfo: z.string().max(16).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(1000),
});

type OrgForm = z.infer<typeof orgSchema>;

type Props = {
  open: boolean;
  existing: Organization | null;
  onClose: () => void;
};

export function OrganizationFormDialog({ open, existing, onClose }: Props) {
  const create = useCreateOrganization();
  const update = useUpdateOrganization();
  const isEdit = !!existing;

  const form = useForm<OrgForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(orgSchema) as any,
    defaultValues: {
      name: "",
      legal_name: "",
      kind: "school",
      director_full_name: "",
      director_position: "Direktor",
      region: "",
      district: "",
      address_line: "",
      phone: "",
      email: "",
      website: "",
      inn: "",
      bank_name: "",
      bank_account: "",
      bank_correspondent: "",
      bank_mfo: "",
      capacity: 10,
    },
  });

  useEffect(() => {
    if (open && existing) {
      form.reset({
        name: existing.name,
        legal_name: existing.legal_name ?? "",
        kind: existing.kind,
        director_full_name: existing.director_full_name,
        director_position: existing.director_position ?? "",
        region: existing.region,
        district: existing.district ?? "",
        address_line: existing.address_line,
        phone: existing.phone,
        email: existing.email ?? "",
        website: existing.website ?? "",
        inn: existing.inn ?? "",
        bank_name: existing.bank_name ?? "",
        bank_account: existing.bank_account ?? "",
        bank_correspondent: existing.bank_correspondent ?? "",
        bank_mfo: existing.bank_mfo ?? "",
        capacity: existing.capacity,
      });
    } else if (open && !existing) {
      form.reset();
    }
  }, [open, existing, form]);

  const onSubmit = async (values: OrgForm) => {
    // Bo'sh stringlarni null qilib yuboramiz
    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === "" ? null : v]),
    ) as Partial<Organization>;
    try {
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, data: payload });
        toast.success("Tashkilot yangilandi");
      } else {
        await create.mutateAsync(payload);
        toast.success("Tashkilot yaratildi");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik yuz berdi");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Tashkilotni tahrirlash" : "Yangi tashkilot"}</DialogTitle>
          <DialogDescription>
            Shartnoma tuzish uchun barcha kerakli maydonlarni to'ldiring
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Section: Identity */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Asosiy ma'lumot
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomi *</FormLabel>
                      <FormControl>
                        <Input placeholder="48-maktab" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kind"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turi *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {KIND_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legal_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>To'liq yuridik nomi</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Shartnoma uchun (ixtiyoriy)"
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
                  name="director_full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rahbar F.I.SH. *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="director_position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rahbar lavozimi</FormLabel>
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
                    <FormItem>
                      <FormLabel>Sig'imi (talabalar) *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Section: Address + contact */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Manzil va aloqa
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Viloyat *</FormLabel>
                      <FormControl>
                        <Input placeholder="Toshkent viloyati" {...field} />
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
                  name="address_line"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Manzil *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ko'cha, uy, kvartira" {...field} />
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
                      <FormLabel>Telefon *</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                  name="website"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Veb-sayt</FormLabel>
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

            {/* Section: Bank */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bank rekvizitlari (shartnoma uchun)
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="inn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>INN</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_mfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MFO</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Bank nomi</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>H/R</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_correspondent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sh/hr</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
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
