import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { CredentialsSection } from "@/components/admin/credentials-section";
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
import { useDepartments, useFaculties } from "@/lib/api/academic";
import { useOrganizations } from "@/lib/api/organizations";
import {
  useCreateSupervisor,
  useUpdateSupervisor,
  useUpdateSupervisorCredentials,
} from "@/lib/api/supervisors";
import type { Supervisor } from "@/lib/api/types";

const NONE_VALUE = "__none__";

const makeCreateSchema = (t: TFunction) =>
  z.object({
    username: z.string().min(3, t("supervisorsSupervisorFormDialog.minChars3")).max(64),
    password: z.string().min(8, t("supervisorsSupervisorFormDialog.minChars8")).max(128),
    email: z
      .string()
      .email(t("supervisorsSupervisorFormDialog.emailInvalid"))
      .optional()
      .or(z.literal("")),
    phone: z.string().max(32).optional().or(z.literal("")),
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    middle_name: z.string().max(100).optional().or(z.literal("")),
    position: z.string().min(2).max(100),
    specialty: z.string().max(150).optional().or(z.literal("")),
    experience_years: z.coerce.number().int().min(0).max(80).optional().or(z.literal(NaN as number)),
    faculty_id: z.string().optional().or(z.literal(NONE_VALUE)),
    department_id: z.string().optional().or(z.literal(NONE_VALUE)),
    organization_ids: z
      .array(z.string())
      .max(5, t("supervisorsSupervisorFormDialog.maxOrganizations"))
      .default([]),
    capacity: z.coerce.number().int().min(1).max(100),
  });

type SupForm = z.infer<ReturnType<typeof makeCreateSchema>>;

const makeUpdateSchema = (t: TFunction) => makeCreateSchema(t).partial();

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
  const orgs = useOrganizations({}, 1, 200);
  const faculties = useFaculties();
  const isEdit = !!existing;

  const form = useForm<SupForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver((isEdit ? makeUpdateSchema(t) : makeCreateSchema(t)) as any) as any,
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
      faculty_id: NONE_VALUE,
      department_id: NONE_VALUE,
      organization_ids: [],
      capacity: 5,
    },
  });

  const selectedFacultyId = form.watch("faculty_id");
  const departments = useDepartments(
    selectedFacultyId && selectedFacultyId !== NONE_VALUE ? selectedFacultyId : undefined,
  );

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
        faculty_id: existing.faculty_id ?? NONE_VALUE,
        department_id: existing.department_id ?? NONE_VALUE,
        organization_ids: existing.organizations.map((o) => o.id),
        capacity: existing.capacity,
      });
    } else if (open) {
      form.reset();
    }
  }, [open, existing, form]);

  const onSubmit = async (values: SupForm) => {
    const facultyId = values.faculty_id === NONE_VALUE ? null : values.faculty_id || null;
    const departmentId =
      values.department_id === NONE_VALUE ? null : values.department_id || null;
    const basePayload = {
      email: values.email || null,
      phone: values.phone || null,
      first_name: values.first_name,
      last_name: values.last_name,
      middle_name: values.middle_name || null,
      position: values.position,
      specialty: values.specialty || null,
      experience_years: Number.isFinite(values.experience_years) ? values.experience_years : null,
      faculty_id: facultyId,
      department_id: departmentId,
      organization_ids: values.organization_ids,
      capacity: values.capacity,
    };

    try {
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, data: basePayload });
        toast.success(t("supervisorsSupervisorFormDialog.updatedToast"));
      } else {
        await create.mutateAsync({
          ...basePayload,
          username: values.username,
          password: values.password,
        } as never);
        toast.success(t("supervisorsSupervisorFormDialog.createdToast"));
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("supervisorsSupervisorFormDialog.errorToast"));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
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

        {/* Edit rejimida — credentials alohida section */}
        {isEdit && existing && (
          <>
            <CredentialsSection
              currentUsername={existing.username}
              isPending={updateCreds.isPending}
              onSave={(payload) =>
                updateCreds.mutateAsync({ id: existing.id, data: payload })
              }
            />
          </>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Login credentials — faqat yangi yaratishda */}
            {!isEdit && (
              <>
                <div>
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
                          <FormLabel>{t("supervisorsSupervisorFormDialog.passwordLabel")} *</FormLabel>
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
                      <FormLabel>{t("supervisorsSupervisorFormDialog.emailLabel")}</FormLabel>
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
                      <FormLabel>{t("supervisorsSupervisorFormDialog.phoneLabel")}</FormLabel>
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
                          placeholder={t("supervisorsSupervisorFormDialog.positionPlaceholder")}
                          {...field}
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
                      <FormLabel>{t("supervisorsSupervisorFormDialog.experienceLabel")}</FormLabel>
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
                      <FormLabel>{t("supervisorsSupervisorFormDialog.capacityLabel")} *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                        value={field.value ?? NONE_VALUE}
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue("department_id", NONE_VALUE);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("supervisorsSupervisorFormDialog.facultyPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>
                            {t("supervisorsSupervisorFormDialog.noneSelected")}
                          </SelectItem>
                          {(faculties.data?.items ?? []).map((f) => (
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
                        value={field.value ?? NONE_VALUE}
                        onValueChange={field.onChange}
                        disabled={!selectedFacultyId || selectedFacultyId === NONE_VALUE}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("supervisorsSupervisorFormDialog.departmentPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>
                            {t("supervisorsSupervisorFormDialog.noneSelected")}
                          </SelectItem>
                          {(departments.data?.items ?? []).map((d) => (
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
                  name="organization_ids"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        {t("supervisorsSupervisorFormDialog.organizationsLabel", {
                          n: field.value.length,
                        })}
                      </FormLabel>
                      <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                        {(orgs.data?.items ?? []).length === 0 && (
                          <div className="px-1 py-2 text-sm text-muted-foreground">
                            {t("supervisorsSupervisorFormDialog.noOrganizations")}
                          </div>
                        )}
                        {(orgs.data?.items ?? []).map((o) => {
                          const checked = field.value.includes(o.id);
                          const atLimit = field.value.length >= 5;
                          return (
                            <label
                              key={o.id}
                              className="flex cursor-pointer items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={checked}
                                disabled={!checked && atLimit}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.checked
                                      ? [...field.value, o.id]
                                      : field.value.filter((x) => x !== o.id),
                                  )
                                }
                              />
                              {o.name}
                            </label>
                          );
                        })}
                      </div>
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
                {isEdit ? t("common.save") : t("supervisorsSupervisorFormDialog.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
