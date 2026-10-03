import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { WeekdayPicker } from "@/components/admin/assignments/weekday-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCreateOrganization, useUpdateOrganization } from "@/lib/api/organizations";
import type { Organization, OrganizationCreate, OrganizationKind } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const KIND_OPTIONS: { value: OrganizationKind; labelKey: string }[] = [
  { value: "school", labelKey: "objectsOrganizationFormDialog.kinds.school" },
  { value: "mtt", labelKey: "objectsOrganizationFormDialog.kinds.mtt" },
  { value: "lyceum", labelKey: "objectsOrganizationFormDialog.kinds.lyceum" },
  { value: "college", labelKey: "objectsOrganizationFormDialog.kinds.college" },
  { value: "university", labelKey: "objectsOrganizationFormDialog.kinds.university" },
  { value: "state_organization", labelKey: "objectsOrganizationFormDialog.kinds.state_organization" },
  { value: "private_organization", labelKey: "objectsOrganizationFormDialog.kinds.private_organization" },
  { value: "company", labelKey: "objectsOrganizationFormDialog.kinds.company" },
  { value: "other", labelKey: "objectsOrganizationFormDialog.kinds.other" },
];

/** Backend: geo_radius_m 10..10000 (standart 100) */
const RADIUS_MIN = 10;
const RADIUS_MAX = 10_000;
const DEFAULT_RADIUS = 100;
const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

const intInRange = (value: string, min: number, max: number) =>
  /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max;

const makeOrgSchema = (t: TFunction) => {
  const maxChars = (n: number) => t("adminValidation.maxChars", { n });
  const optionalText = (max: number) => z.string().trim().max(max, maxChars(max));
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, t("objectsOrganizationFormDialog.validation.nameMin"))
      .max(200, maxChars(200)),
    legal_name: optionalText(300),
    kind: z.enum([
      "school",
      "mtt",
      "lyceum",
      "college",
      "university",
      "state_organization",
      "private_organization",
      "company",
      "other",
    ]),
    director_full_name: z
      .string()
      .trim()
      .min(3, t("objectsOrganizationFormDialog.validation.directorFullName"))
      .max(200, maxChars(200)),
    director_position: optionalText(100),
    region: z
      .string()
      .trim()
      .min(2, t("adminValidation.minChars", { n: 2 }))
      .max(64, maxChars(64)),
    district: optionalText(64),
    address_line: z
      .string()
      .trim()
      .min(3, t("adminValidation.minChars", { n: 3 }))
      .max(300, maxChars(300)),
    phone: z
      .string()
      .trim()
      .min(5, t("adminValidation.minChars", { n: 5 }))
      .max(32, maxChars(32)),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || z.email().safeParse(v).success, {
        message: t("objectsOrganizationFormDialog.validation.emailInvalid"),
      }),
    website: optionalText(255),
    inn: optionalText(16),
    bank_name: optionalText(200),
    bank_account: optionalText(32),
    bank_correspondent: optionalText(32),
    bank_mfo: optionalText(16),
    capacity: z
      .string()
      .trim()
      .refine((v) => intInRange(v, 1, 1000), {
        message: t("adminValidation.intRange", { min: 1, max: 1000 }),
      }),
    geo: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    geo_radius_m: z
      .string()
      .trim()
      .refine((v) => intInRange(v, RADIUS_MIN, RADIUS_MAX), {
        message: t("adminValidation.intRange", { min: RADIUS_MIN, max: RADIUS_MAX }),
      }),
    // Ma'lumot uchun maydon: eski tashkilotlarda bo'sh ([]) saqlangan — tahrirlashni bloklamasin
    work_days: z.array(z.number().int().min(1).max(7)),
    is_active: z.boolean(),
  });
};

type OrgForm = z.infer<ReturnType<typeof makeOrgSchema>>;

/** API Decimal'ni satr ko'rinishida qaytarishi mumkin ("41.311") */
function toCoord(value: number | string | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toFormValues(existing: Organization | null, directorDefault: string): OrgForm {
  if (!existing) {
    return {
      name: "",
      legal_name: "",
      kind: "school",
      director_full_name: "",
      director_position: directorDefault,
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
      capacity: "10",
      geo: null,
      geo_radius_m: String(DEFAULT_RADIUS),
      work_days: DEFAULT_WORK_DAYS,
      is_active: true,
    };
  }
  const lat = toCoord(existing.geo_lat);
  const lng = toCoord(existing.geo_lng);
  return {
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
    capacity: String(existing.capacity),
    geo: lat !== null && lng !== null ? { lat, lng } : null,
    geo_radius_m: String(existing.geo_radius_m || DEFAULT_RADIUS),
    work_days: [...(existing.work_days ?? [])].sort((a, b) => a - b),
    is_active: existing.is_active,
  };
}

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
  const formId = useId();
  const workDaysLabelId = useId();

  const schema = useMemo(() => makeOrgSchema(t), [t]);
  const form = useForm<OrgForm>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(null, ""),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(toFormValues(existing, t("objectsOrganizationFormDialog.directorDefault")));
  }, [open, existing, form, t]);

  const radiusInput = form.watch("geo_radius_m");
  const radiusM = intInRange(radiusInput.trim(), RADIUS_MIN, RADIUS_MAX)
    ? Number(radiusInput)
    : null;

  const onSubmit = async (v: OrgForm) => {
    const payload: Partial<OrganizationCreate> = {
      name: v.name,
      legal_name: v.legal_name || null,
      kind: v.kind,
      director_full_name: v.director_full_name,
      director_position: v.director_position || null,
      region: v.region,
      district: v.district || null,
      address_line: v.address_line,
      phone: v.phone,
      email: v.email || null,
      website: v.website || null,
      inn: v.inn || null,
      bank_name: v.bank_name || null,
      bank_account: v.bank_account || null,
      bank_correspondent: v.bank_correspondent || null,
      bank_mfo: v.bank_mfo || null,
      capacity: Number(v.capacity),
      geo_lat: v.geo?.lat ?? null,
      geo_lng: v.geo?.lng ?? null,
      geo_radius_m: Number(v.geo_radius_m),
      work_days: v.work_days,
      is_active: v.is_active,
    };
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, data: payload });
        toast.success(t("objectsOrganizationFormDialog.updated"));
      } else {
        await create.mutateAsync(payload);
        toast.success(t("objectsOrganizationFormDialog.created"));
      }
      onClose();
    } catch (e) {
      await applyServerFieldErrors(form, e);
      toast.error(
        e instanceof HTTPError ? e.message : t("objectsOrganizationFormDialog.errorOccurred"),
      );
    }
  };

  const busy = create.isPending || update.isPending;

  const textField = (
    name:
      | "legal_name"
      | "director_full_name"
      | "director_position"
      | "region"
      | "district"
      | "address_line"
      | "phone"
      | "website"
      | "inn"
      | "bank_name"
      | "bank_account"
      | "bank_correspondent"
      | "bank_mfo",
    label: string,
    options: { required?: boolean; placeholder?: string; className?: string; type?: string } = {},
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={options.className}>
          <FormLabel>
            {label}
            {options.required ? " *" : ""}
          </FormLabel>
          <FormControl>
            <Input {...field} type={options.type} placeholder={options.placeholder} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("objectsOrganizationFormDialog.editTitle")
              : t("objectsOrganizationFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("objectsOrganizationFormDialog.subtitle")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, () => toast.error(t("common.formInvalid")))} className="space-y-4" noValidate>
            {/* Asosiy ma'lumot */}
            <section>
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
                          {...field}
                          placeholder={t("objectsOrganizationFormDialog.namePlaceholder")}
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
                {textField("legal_name", t("objectsOrganizationFormDialog.legalName"), {
                  className: "md:col-span-2",
                  placeholder: t("objectsOrganizationFormDialog.legalNamePlaceholder"),
                })}
                {textField("director_full_name", t("objectsOrganizationFormDialog.directorName"), {
                  required: true,
                })}
                {textField("director_position", t("objectsOrganizationFormDialog.directorPosition"))}
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("objectsOrganizationFormDialog.capacity")} *</FormLabel>
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
                          <FormLabel>{t("objectsOrganizationFormDialog.isActive")}</FormLabel>
                          <FormDescription>
                            {t("objectsOrganizationFormDialog.isActiveHint")}
                          </FormDescription>
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
            </section>

            <Separator />

            {/* Manzil, aloqa va geo-fence */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("objectsOrganizationFormDialog.sectionAddress")}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {textField("region", t("objectsOrganizationFormDialog.region"), {
                  required: true,
                  placeholder: t("objectsOrganizationFormDialog.regionPlaceholder"),
                })}
                {textField("district", t("objectsOrganizationFormDialog.district"))}
                {textField("address_line", t("objectsOrganizationFormDialog.address"), {
                  required: true,
                  className: "md:col-span-2",
                  placeholder: t("objectsOrganizationFormDialog.addressPlaceholder"),
                })}
                {textField("phone", t("objectsOrganizationFormDialog.phone"), {
                  required: true,
                  type: "tel",
                })}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("objectsOrganizationFormDialog.email")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {textField("website", t("objectsOrganizationFormDialog.website"), {
                  className: "md:col-span-2",
                })}
              </div>

              <div className="mt-4 space-y-3 rounded-lg border border-border p-3">
                <div>
                  <h4 className="text-sm font-medium">
                    {t("objectsOrganizationFormDialog.mapLocation")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t("objectsOrganizationFormDialog.mapHintGeofence")}
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="geo"
                  render={({ field }) => (
                    <FormItem>
                      <MapPicker
                        value={field.value}
                        onChange={field.onChange}
                        onClear={() => field.onChange(null)}
                        radiusM={radiusM}
                        height={280}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="geo_radius_m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("objectsOrganizationFormDialog.geoRadius")} *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            inputMode="numeric"
                            min={RADIUS_MIN}
                            max={RADIUS_MAX}
                            step={10}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("objectsOrganizationFormDialog.geoRadiusHint")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="work_days"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <div
                          id={workDaysLabelId}
                          className={cn(
                            "text-sm font-medium leading-none",
                            fieldState.error && "text-destructive",
                          )}
                        >
                          {t("objectsOrganizationFormDialog.workDays")}
                        </div>
                        <div role="group" aria-labelledby={workDaysLabelId}>
                          <WeekdayPicker
                            value={field.value}
                            onChange={field.onChange}
                            disabled={busy}
                          />
                        </div>
                        <FormDescription>
                          {t("objectsOrganizationFormDialog.workDaysHint")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Bank rekvizitlari */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("objectsOrganizationFormDialog.sectionBank")}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {textField("inn", t("objectsOrganizationFormDialog.inn"))}
                {textField("bank_mfo", t("objectsOrganizationFormDialog.mfo"))}
                {textField("bank_name", t("objectsOrganizationFormDialog.bankName"), {
                  className: "md:col-span-2",
                })}
                {textField("bank_account", t("objectsOrganizationFormDialog.bankAccount"))}
                {textField(
                  "bank_correspondent",
                  t("objectsOrganizationFormDialog.bankCorrespondent"),
                )}
              </div>
            </section>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form={formId} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? t("common.save") : t("objectsOrganizationFormDialog.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
