import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { HTTPError } from "ky";
import { Check, Layers, Loader2, Save, School, ShieldCheck } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import {
  PERMISSION_MODULE_IDS,
  isPermissionModuleId,
  permissionDescKey,
  permissionNameKey,
} from "@/components/admin/admins/permission-modules";
import { CredentialsSection } from "@/components/admin/credentials-section";
import { applyServerFieldErrors } from "@/components/admin/students/server-field-errors";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { useAllFaculties } from "@/lib/api/academic";
import {
  useCreateAdmin,
  useUpdateAdmin,
  useUpdateAdminCredentials,
} from "@/lib/api/admins";
import type { Admin, AdminUpdate } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const ALL_FACULTIES = "__all__";
/** Backend: AdminCreate.password min_length=6 */
const PASSWORD_MIN = 6;

const makeSchema = (t: TFunction, isEdit: boolean) =>
  z.object({
    // Tahrirlashda login/parol alohida bo'limda (CredentialsSection) o'zgartiriladi
    username: isEdit
      ? z.string()
      : z.string().trim().min(3, t("adminsAdminFormDialog.usernameMin")).max(64),
    password: isEdit
      ? z.string()
      : z
          .string()
          .min(PASSWORD_MIN, t("adminsAdminFormDialog.passwordMin", { n: PASSWORD_MIN }))
          .max(128),
    last_name: z.string().trim().min(1, t("adminsAdminFormDialog.lastNameRequired")).max(100),
    first_name: z.string().trim().min(1, t("adminsAdminFormDialog.firstNameRequired")).max(100),
    middle_name: z.string().trim().max(100),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || z.email().safeParse(v).success, {
        message: t("adminsAdminFormDialog.emailInvalid"),
      }),
    phone: z.string().trim().max(32),
    role: z.enum(["admin", "super_admin"]),
    is_active: z.boolean(),
    faculty_id: z.string(),
    permissions: z.array(z.enum(PERMISSION_MODULE_IDS)),
  });

type Values = z.infer<ReturnType<typeof makeSchema>>;
type Role = Values["role"];

function toFormValues(existing: Admin | null): Values {
  if (!existing) {
    return {
      username: "",
      password: "",
      last_name: "",
      first_name: "",
      middle_name: "",
      email: "",
      phone: "",
      role: "admin",
      is_active: true,
      faculty_id: ALL_FACULTIES,
      // Yangi admin uchun standart — barcha modullar
      permissions: [...PERMISSION_MODULE_IDS],
    };
  }
  return {
    username: existing.username,
    password: "",
    last_name: existing.last_name,
    first_name: existing.first_name,
    middle_name: existing.middle_name ?? "",
    email: existing.email ?? "",
    phone: existing.phone ?? "",
    role: existing.role,
    is_active: existing.is_active,
    faculty_id: existing.faculty_id ?? ALL_FACULTIES,
    permissions: (existing.permissions ?? []).filter(isPermissionModuleId),
  };
}

type Props = {
  open: boolean;
  existing: Admin | null;
  /** Joriy foydalanuvchi id'si — o'z rolini/holatini o'zgartirishning oldini olish uchun */
  currentUserId: string | null;
  onClose: () => void;
};

export function AdminFormDialog({ open, existing, currentUserId, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateAdmin();
  const update = useUpdateAdmin();
  const updateCreds = useUpdateAdminCredentials();
  const faculties = useAllFaculties();

  const isEdit = !!existing;
  const isSelf = !!existing && existing.id === currentUserId;

  const formId = useId();
  const permissionsHeadingId = useId();
  const schema = useMemo(() => makeSchema(t, isEdit), [t, isEdit]);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(null),
  });
  const [confirmNoAccess, setConfirmNoAccess] = useState<Values | null>(null);

  // Forma faqat ochilganda yoki boshqa admin tanlanganda to'ldiriladi — ro'yxat qayta
  // yuklanib `existing` obyekti yangilansa, kiritilayotgan o'zgarishlar o'chib ketmasin.
  const initializedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = open ? (existing?.id ?? "new") : null;
    if (key === initializedFor.current) return;
    initializedFor.current = key;
    if (open) {
      form.reset(toFormValues(existing));
      setConfirmNoAccess(null);
    }
  }, [open, existing, form]);

  const role = form.watch("role");
  const permissions = form.watch("permissions");
  const facultyId = form.watch("faculty_id");

  const setRole = (next: Role) => {
    form.setValue("role", next, { shouldDirty: true });
    // Super admin → admin: bo'sh ro'yxat "hech qanday ruxsat yo'q" degani — barchasini tanlab qo'yamiz
    if (next === "admin" && form.getValues("permissions").length === 0) {
      form.setValue("permissions", [...PERMISSION_MODULE_IDS], { shouldDirty: true });
    }
  };

  const togglePermission = (id: (typeof PERMISSION_MODULE_IDS)[number]) => {
    const current = form.getValues("permissions");
    form.setValue(
      "permissions",
      current.includes(id) ? current.filter((p) => p !== id) : [...current, id],
      { shouldDirty: true },
    );
  };

  const save = async (v: Values) => {
    const isAdminRole = v.role === "admin";
    const base = {
      first_name: v.first_name,
      last_name: v.last_name,
      middle_name: v.middle_name || null,
      email: v.email || null,
      phone: v.phone || null,
      faculty_id: isAdminRole && v.faculty_id !== ALL_FACULTIES ? v.faculty_id : null,
      permissions: isAdminRole ? v.permissions : [],
    };
    try {
      if (existing) {
        // O'zini o'zi rol/holatdan chiqara olmaydi (backend ham 409 qaytaradi)
        const data: AdminUpdate = isSelf
          ? base
          : { ...base, role: v.role, is_active: v.is_active };
        await update.mutateAsync({ id: existing.id, data });
        toast.success(t("common.updated"));
      } else {
        await create.mutateAsync({
          ...base,
          role: v.role,
          username: v.username,
          password: v.password,
        });
        toast.success(t("adminsAdminFormDialog.adminCreated"));
      }
      onClose();
    } catch (e) {
      await applyServerFieldErrors(form, e);
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const onSubmit = (v: Values) => {
    if (v.role === "admin" && v.permissions.length === 0) {
      setConfirmNoAccess(v);
      return;
    }
    void save(v);
  };

  const busy = create.isPending || update.isPending;
  const facultyItems = faculties.data ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isEdit
              ? t("adminsAdminFormDialog.editTitle")
              : t("adminsAdminFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("adminsAdminFormDialog.editDescription")
              : t("adminsAdminFormDialog.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {!isEdit && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("adminsAdminFormDialog.username")} *</FormLabel>
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
                        <FormLabel>{t("adminsAdminFormDialog.password")} *</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" autoComplete="new-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Separator />
              </>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("adminsAdminFormDialog.lastName")} *</FormLabel>
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
                    <FormLabel>{t("adminsAdminFormDialog.firstName")} *</FormLabel>
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
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t("adminsAdminFormDialog.middleName")}</FormLabel>
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
                    <FormLabel>{t("adminsAdminFormDialog.email")}</FormLabel>
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
                    <FormLabel>{t("adminsAdminFormDialog.phone")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("adminsAdminFormDialog.role")} *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => setRole(v === "super_admin" ? "super_admin" : "admin")}
                      disabled={isSelf}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">{t("adminsAdminFormDialog.roleAdmin")}</SelectItem>
                        <SelectItem value="super_admin">
                          {t("adminsAdminFormDialog.roleSuperAdmin")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isEdit && (
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.status")}</FormLabel>
                      <Select
                        value={field.value ? "true" : "false"}
                        onValueChange={(v) => field.onChange(v === "true")}
                        disabled={isSelf}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">{t("adminsAdminFormDialog.active")}</SelectItem>
                          <SelectItem value="false">{t("adminsAdminFormDialog.blocked")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {isSelf && (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {t("adminsAdminFormDialog.selfRoleLocked")}
                </p>
              )}
            </div>

            {role === "super_admin" ? (
              <Alert className="border-amber-500/20 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/20">
                <AlertDescription className="text-xs text-amber-900 dark:text-amber-200">
                  <Trans
                    i18nKey="adminsAdminFormDialog.superAdminWarning"
                    components={[<strong key="0" />]}
                  />
                  <span className="mt-1 block font-medium">
                    {t("adminsAdminFormDialog.superAdminFullAccess")}
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Separator />

                {/* Fakultet bo'yicha cheklash (scoping) */}
                <FormField
                  control={form.control}
                  name="faculty_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-semibold">
                        <School className="h-4 w-4 text-primary" aria-hidden="true" />
                        {t("adminsAdminFormDialog.facultyScopeLabel")}
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("adminsAdminFormDialog.facultyPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          <SelectItem value={ALL_FACULTIES}>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {t("adminsAdminFormDialog.allFacultiesOption")}
                            </span>
                          </SelectItem>
                          {facultyItems.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.code ? `${f.name} (${f.code})` : f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription
                        className={cn(
                          "leading-relaxed",
                          facultyId !== ALL_FACULTIES &&
                            "font-medium text-indigo-600 dark:text-indigo-400",
                        )}
                      >
                        {facultyId === ALL_FACULTIES
                          ? t("adminsAdminFormDialog.scopeAllHint")
                          : t("adminsAdminFormDialog.scopeFacultyHint")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Modul darajasidagi ruxsatlar */}
                <div role="group" aria-labelledby={permissionsHeadingId} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span id={permissionsHeadingId}>
                        {t("adminsAdminFormDialog.permissionsLabel")}
                      </span>
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {permissions.length} / {PERMISSION_MODULE_IDS.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          form.setValue("permissions", [...PERMISSION_MODULE_IDS], {
                            shouldDirty: true,
                          })
                        }
                      >
                        {t("adminsAdminFormDialog.selectAll")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => form.setValue("permissions", [], { shouldDirty: true })}
                      >
                        {t("adminsAdminFormDialog.clearAll")}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {PERMISSION_MODULE_IDS.map((id) => {
                      const checked = permissions.includes(id);
                      return (
                        <label
                          key={id}
                          className={cn(
                            "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                            checked
                              ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                              : "border-border/60 hover:border-border hover:bg-muted/40",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => togglePermission(id)}
                          />
                          <span className="mt-0.5 shrink-0" aria-hidden="true">
                            {checked ? (
                              <span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-primary-foreground">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="block h-4 w-4 rounded border border-muted-foreground/40" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-foreground">
                              {t(permissionNameKey(id))}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                              {t(permissionDescKey(id))}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {permissions.length === 0 && (
                    <p className="text-xs font-medium text-destructive">
                      {t("adminsAdminFormDialog.noPermissionsWarning")}
                    </p>
                  )}
                </div>
              </>
            )}
          </form>
        </Form>

        {existing && (
          <>
            <Separator />
            <CredentialsSection
              key={existing.id}
              currentUsername={existing.username}
              isPending={updateCreds.isPending}
              onSave={(payload) => updateCreds.mutateAsync({ id: existing.id, data: payload })}
            />
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form={formId} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? t("common.save") : t("adminsAdminFormDialog.create")}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={!!confirmNoAccess}
        title={t("adminsAdminFormDialog.noPermissionsConfirmTitle")}
        description={t("adminsAdminFormDialog.noPermissionsConfirmBody")}
        confirmText={t("adminsAdminFormDialog.noPermissionsConfirmAction")}
        variant="destructive"
        isPending={busy}
        onConfirm={() => {
          const pending = confirmNoAccess;
          setConfirmNoAccess(null);
          if (pending) void save(pending);
        }}
        onClose={() => setConfirmNoAccess(null)}
      />
    </Dialog>
  );
}
