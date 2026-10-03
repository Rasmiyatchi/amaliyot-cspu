import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { CredentialsSection } from "@/components/admin/credentials-section";
import { Switch } from "@/components/admin/objects/switch";
import { applyServerFieldErrors } from "@/components/admin/students/server-field-errors";
import { OrganizationMultiPicker } from "@/components/admin/supervisors/organization-multi-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAllDepartments, useAllFaculties } from "@/lib/api/academic";
import {
  useCreateSupervisor,
  useUpdateSupervisor,
  useUpdateSupervisorCredentials,
  type SupervisorUpdate,
} from "@/lib/api/supervisors";
import type { Supervisor } from "@/lib/api/types";

const NONE_VALUE = "__none__";
const MAX_ORGANIZATIONS = 5;

/** Bo'sh yoki [min, max] oralig'idagi butun son (input qiymati matn sifatida saqlanadi). */
const intInRange = (value: string, min: number, max: number) =>
  /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max;

const makeSchema = (t: TFunction, isEdit: boolean) =>
  z.object({
    // Tahrirlashda login/parol alohida bo'limda (CredentialsSection) o'zgartiriladi
    username: isEdit
      ? z.string()
      : z
          .string()
          .trim()
          .min(3, t("supervisorsSupervisorFormDialog.minChars3"))
          .max(64, t("adminValidation.maxChars", { n: 64 })),
    password: isEdit
      ? z.string()
      : z
          .string()
          .min(8, t("supervisorsSupervisorFormDialog.minChars8"))
          .max(128, t("adminValidation.maxChars", { n: 128 })),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || z.email().safeParse(v).success, {
        message: t("supervisorsSupervisorFormDialog.emailInvalid"),
      }),
    phone: z.string().trim().max(32, t("adminValidation.maxChars", { n: 32 })),
    last_name: z
      .string()
      .trim()
      .min(1, t("adminValidation.required"))
      .max(100, t("adminValidation.maxChars", { n: 100 })),
    first_name: z
      .string()
      .trim()
      .min(1, t("adminValidation.required"))
      .max(100, t("adminValidation.maxChars", { n: 100 })),
    middle_name: z.string().trim().max(100, t("adminValidation.maxChars", { n: 100 })),
    position: z
      .string()
      .trim()
      .min(2, t("adminValidation.minChars", { n: 2 }))
      .max(100, t("adminValidation.maxChars", { n: 100 })),
    specialty: z.string().trim().max(150, t("adminValidation.maxChars", { n: 150 })),
    experience_years: z
      .string()
      .trim()
      .refine((v) => v === "" || intInRange(v, 0, 80), {
        message: t("adminValidation.intRange", { min: 0, max: 80 }),
      }),
    capacity: z
      .string()
      .trim()
      .refine((v) => intInRange(v, 1, 500), {
        message: t("adminValidation.intRange", { min: 1, max: 500 }),
      }),
    faculty_id: z.string(),
    department_id: z.string(),
    organizations: z
      .array(z.object({ id: z.string(), name: z.string() }))
      .max(MAX_ORGANIZATIONS, t("supervisorsSupervisorFormDialog.maxOrganizations")),
    is_active: z.boolean(),
  });

type Values = z.infer<ReturnType<typeof makeSchema>>;

function toFormValues(existing: Supervisor | null): Values {
  if (!existing) {
    return {
      username: "",
      password: "",
      email: "",
      phone: "",
      last_name: "",
      first_name: "",
      middle_name: "",
      position: "",
      specialty: "",
      experience_years: "",
      capacity: "5",
      faculty_id: NONE_VALUE,
      department_id: NONE_VALUE,
      organizations: [],
      is_active: true,
    };
  }
  return {
    username: existing.username,
    password: "",
    email: existing.email ?? "",
    phone: existing.phone ?? "",
    last_name: existing.last_name,
    first_name: existing.first_name,
    middle_name: existing.middle_name ?? "",
    position: existing.position,
    specialty: existing.specialty ?? "",
    experience_years: existing.experience_years != null ? String(existing.experience_years) : "",
    capacity: String(existing.capacity),
    faculty_id: existing.faculty_id ?? NONE_VALUE,
    department_id: existing.department_id ?? NONE_VALUE,
    organizations: existing.organizations.map((o) => ({ id: o.id, name: o.name })),
    is_active: existing.is_active,
  };
}

type Props = {
  open: boolean;
  existing: Supervisor | null;
  onClose: () => void;
};

export function SupervisorFormDialog({ open, existing, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateSupervisor();
  const update = useUpdateSupervisor();
  const updateCreds = useUpdateSupervisorCredentials();
  const faculties = useAllFaculties();
  const isEdit = !!existing;
  const formId = useId();

  const schema = useMemo(() => makeSchema(t, isEdit), [t, isEdit]);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(null),
  });

  // Faqat ochilganda yoki boshqa supervizor tanlanganda to'ldiriladi — ro'yxat qayta yuklanib
  // `existing` yangilansa (masalan, login o'zgargach) kiritilayotgan o'zgarishlar yo'qolmasin.
  const initializedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = open ? (existing?.id ?? "new") : null;
    if (key === initializedFor.current) return;
    initializedFor.current = key;
    if (open) form.reset(toFormValues(existing));
  }, [open, existing, form]);

  const selectedFacultyId = form.watch("faculty_id");
  const hasFaculty = selectedFacultyId !== NONE_VALUE;
  const departments = useAllDepartments(hasFaculty ? selectedFacultyId : undefined, {
    enabled: hasFaculty,
  });

  const onSubmit = async (v: Values) => {
    const basePayload: SupervisorUpdate = {
      email: v.email || null,
      phone: v.phone || null,
      first_name: v.first_name,
      last_name: v.last_name,
      middle_name: v.middle_name || null,
      position: v.position,
      specialty: v.specialty || null,
      experience_years: v.experience_years === "" ? null : Number(v.experience_years),
      faculty_id: v.faculty_id === NONE_VALUE ? null : v.faculty_id,
      department_id: v.department_id === NONE_VALUE ? null : v.department_id,
      organization_ids: v.organizations.map((o) => o.id),
      capacity: Number(v.capacity),
    };

    try {
      if (existing) {
        await update.mutateAsync({
          id: existing.id,
          data: { ...basePayload, is_active: v.is_active },
        });
        toast.success(t("supervisorsSupervisorFormDialog.updatedToast"));
      } else {
        await create.mutateAsync({
          ...basePayload,
          first_name: v.first_name,
          last_name: v.last_name,
          position: v.position,
          capacity: Number(v.capacity),
          username: v.username,
          password: v.password,
        });
        toast.success(t("supervisorsSupervisorFormDialog.createdToast"));
      }
      onClose();
    } catch (e) {
      await applyServerFieldErrors(form, e);
      toast.error(
        e instanceof HTTPError ? e.message : t("supervisorsSupervisorFormDialog.errorToast"),
      );
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("supervisorsSupervisorFormDialog.editTitle")
              : t("supervisorsSupervisorFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("supervisorsSupervisorFormDialog.editDescription")
              : t("supervisorsSupervisorFormDialog.createDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Tahrirlashda — login/parol alohida bo'lim (forma tashqarisida) */}
        {existing && (
          <>
            <CredentialsSection
              key={existing.id}
              currentUsername={existing.username}
              isPending={updateCreds.isPending}
              onSave={(payload) => updateCreds.mutateAsync({ id: existing.id, data: payload })}
            />
            <Separator />
          </>
        )}

        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, () => toast.error(t("common.formInvalid")))} className="space-y-4" noValidate>
            {/* Login ma'lumotlari — faqat yangi yaratishda */}
            {!isEdit && (
              <>
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("supervisorsSupervisorFormDialog.loginSection")}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("supervisorsSupervisorFormDialog.usernameLabel")} *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              autoComplete="off"
                              autoCapitalize="off"
                              spellCheck={false}
                            />
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
                          <FormLabel>{t("supervisorsSupervisorFormDialog.passwordLabel")} *</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" autoComplete="new-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* Shaxsiy ma'lumot */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("supervisorsSupervisorFormDialog.personalSection")}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("supervisorsSupervisorFormDialog.lastNameLabel")} *</FormLabel>
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
                      <FormLabel>{t("supervisorsSupervisorFormDialog.firstNameLabel")} *</FormLabel>
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
                      <FormLabel>{t("supervisorsSupervisorFormDialog.middleNameLabel")}</FormLabel>
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
                      <FormLabel>{t("supervisorsSupervisorFormDialog.emailLabel")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" autoComplete="off" />
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
                      <FormLabel>{t("supervisorsSupervisorFormDialog.phoneLabel")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <Separator />

            {/* Kasbiy ma'lumot */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("supervisorsSupervisorFormDialog.professionalSection")}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("supervisorsSupervisorFormDialog.positionLabel")} *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("supervisorsSupervisorFormDialog.positionPlaceholder")}
                        />
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
                      <FormLabel>{t("supervisorsSupervisorFormDialog.specialtyLabel")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>{t("supervisorsSupervisorFormDialog.experienceLabel")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" inputMode="numeric" min={0} max={80} />
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
                      <FormLabel>{t("supervisorsSupervisorFormDialog.capacityLabel")} *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" inputMode="numeric" min={1} max={500} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="faculty_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.faculty")}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue("department_id", NONE_VALUE);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("supervisorsSupervisorFormDialog.facultyPlaceholder")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value={NONE_VALUE}>
                            {t("supervisorsSupervisorFormDialog.noneSelected")}
                          </SelectItem>
                          {(faculties.data ?? []).map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
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
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("supervisorsSupervisorFormDialog.departmentLabel")}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!hasFaculty}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("supervisorsSupervisorFormDialog.departmentPlaceholder")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value={NONE_VALUE}>
                            {t("supervisorsSupervisorFormDialog.noneSelected")}
                          </SelectItem>
                          {(departments.data ?? []).map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
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
                  name="organizations"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        {t("supervisorsSupervisorFormDialog.organizationsLabel", {
                          n: field.value.length,
                        })}
                      </FormLabel>
                      <FormControl>
                        <OrganizationMultiPicker
                          value={field.value}
                          onChange={field.onChange}
                          max={MAX_ORGANIZATIONS}
                          disabled={busy}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isEdit && (
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                          <div className="min-w-0 space-y-0.5">
                            <FormLabel>{t("supervisorsSupervisorFormDialog.isActive")}</FormLabel>
                            <FormDescription>
                              {t("supervisorsSupervisorFormDialog.isActiveHint")}
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
            {isEdit ? t("common.save") : t("supervisorsSupervisorFormDialog.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
