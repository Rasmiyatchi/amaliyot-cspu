import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
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

const KIND_OPTIONS: { value: OrganizationKind; labelKey: string }[] = [
  { value: "school", labelKey: "objectsOrganizationFormDialog.kinds.school" },
  { value: "mtt", labelKey: "objectsOrganizationFormDialog.kinds.mtt" },
  { value: "lyceum", labelKey: "objectsOrganizationFormDialog.kinds.lyceum" },
  { value: "college", labelKey: "objectsOrganizationFormDialog.kinds.college" },
  { value: "company", labelKey: "objectsOrganizationFormDialog.kinds.company" },
  { value: "university", labelKey: "objectsOrganizationFormDialog.kinds.university" },
  { value: "other", labelKey: "objectsOrganizationFormDialog.kinds.other" },
];

const makeOrgSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(2, t("objectsOrganizationFormDialog.validation.nameMin")).max(200),
    legal_name: z.string().max(300).optional().or(z.literal("")),
    kind: z.enum(["school", "mtt", "lyceum", "college", "company", "university", "other"]),
    director_full_name: z
      .string()
      .min(3, t("objectsOrganizationFormDialog.validation.directorFullName"))
      .max(200),
    director_position: z.string().max(100).optional().or(z.literal("")),
    region: z.string().min(2).max(64),
    district: z.string().max(64).optional().or(z.literal("")),
    address_line: z.string().min(3).max(300),
    phone: z.string().min(5).max(32),
    email: z
      .string()
      .email(t("objectsOrganizationFormDialog.validation.emailInvalid"))
      .optional()
      .or(z.literal("")),
    website: z.string().max(255).optional().or(z.literal("")),
    inn: z.string().max(16).optional().or(z.literal("")),
    bank_name: z.string().max(200).optional().or(z.literal("")),
    bank_account: z.string().max(32).optional().or(z.literal("")),
    bank_correspondent: z.string().max(32).optional().or(z.literal("")),
    bank_mfo: z.string().max(16).optional().or(z.literal("")),
    capacity: z.coerce.number().int().min(1).max(1000),
  });

type OrgForm = z.infer<ReturnType<typeof makeOrgSchema>>;

type Props = {
  open: boolean;
  existing: Organization | null;
  onClose: () => void;
};

export function OrganizationFormDialog({ open, existing, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateOrganization();
  const update = useUpdateOrganization();
  const isEdit = !!existing;

  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  const form = useForm<OrgForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(makeOrgSchema(t)) as any,
    defaultValues: {
      name: "",
      legal_name: "",
      kind: "school",
      director_full_name: "",
      director_position: t("objectsOrganizationFormDialog.directorDefault"),
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
      setGeo(
        existing.geo_lat && existing.geo_lng
          ? { lat: Number(existing.geo_lat), lng: Number(existing.geo_lng) }
          : null,
      );
    } else if (open && !existing) {
      form.reset();
      setGeo(null);
    }
  }, [open, existing, form]);

  const onSubmit = async (values: OrgForm) => {
    // Bo'sh stringlarni null qilib yuboramiz
    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === "" ? null : v]),
    ) as Partial<Organization>;
    payload.geo_lat = geo?.lat ?? null;
    payload.geo_lng = geo?.lng ?? null;
    try {
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, data: payload });
        toast.success(t("objectsOrganizationFormDialog.updated"));
      } else {
        await create.mutateAsync(payload);
        toast.success(t("objectsOrganizationFormDialog.created"));
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("objectsOrganizationFormDialog.errorOccurred"));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("objectsOrganizationFormDialog.editTitle")
              : t("objectsOrganizationFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("objectsOrganizationFormDialog.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Section: Identity */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("objectsOrganizationFormDialog.sectionMain")}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.name")} *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("objectsOrganizationFormDialog.namePlaceholder")}
                          {...field}
                        />
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
                      <FormLabel>{t("objectsOrganizationFormDialog.kind")} *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {KIND_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {t(o.labelKey)}
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
                      <FormLabel>{t("objectsOrganizationFormDialog.legalName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("objectsOrganizationFormDialog.legalNamePlaceholder")}
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
                      <FormLabel>{t("objectsOrganizationFormDialog.directorName")} *</FormLabel>
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
                      <FormLabel>{t("objectsOrganizationFormDialog.directorPosition")}</FormLabel>
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
                      <FormLabel>{t("objectsOrganizationFormDialog.capacity")} *</FormLabel>
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
                {t("objectsOrganizationFormDialog.sectionAddress")}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("objectsOrganizationFormDialog.region")} *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("objectsOrganizationFormDialog.regionPlaceholder")}
                          {...field}
                        />
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
                      <FormLabel>{t("objectsOrganizationFormDialog.district")}</FormLabel>
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
                      <FormLabel>{t("objectsOrganizationFormDialog.address")} *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("objectsOrganizationFormDialog.addressPlaceholder")}
                          {...field}
                        />
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
                      <FormLabel>{t("objectsOrganizationFormDialog.phone")} *</FormLabel>
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
                      <FormLabel>{t("objectsOrganizationFormDialog.website")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-3 space-y-2">
                <label className="text-sm font-medium">
                  {t("objectsOrganizationFormDialog.mapLocation")}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {t("objectsOrganizationFormDialog.mapHint")}
                  </span>
                </label>
                <MapPicker value={geo} onChange={setGeo} height={280} />
              </div>
            </div>

            <Separator />

            {/* Section: Bank */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("objectsOrganizationFormDialog.sectionBank")}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="inn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("objectsOrganizationFormDialog.inn")}</FormLabel>
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
                      <FormLabel>{t("objectsOrganizationFormDialog.mfo")}</FormLabel>
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
                      <FormLabel>{t("objectsOrganizationFormDialog.bankName")}</FormLabel>
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
                      <FormLabel>{t("objectsOrganizationFormDialog.bankAccount")}</FormLabel>
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
                      <FormLabel>{t("objectsOrganizationFormDialog.bankCorrespondent")}</FormLabel>
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
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? t("common.save") : t("objectsOrganizationFormDialog.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
