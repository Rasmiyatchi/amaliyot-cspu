import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { HTTPError } from "ky";
import { Info, Loader2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/admin/academic/searchable-select";
import { applyServerFieldErrors } from "@/components/admin/students/server-field-errors";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useAllDirections, useAllFaculties, useAllGroups } from "@/lib/api/academic";
import {
  useCreateStudent,
  useUpdateStudent,
  type StudentCreatePayload,
  type StudentUpdatePayload,
} from "@/lib/api/students";
import type { Student } from "@/lib/api/types";

type Props = {
  open: boolean;
  /** Mavjud talaba — bo'lsa edit, bo'lmasa create. */
  student?: Student | null;
  onClose: () => void;
};

const EDU_FORMS = [
  { value: "daytime", labelKey: "studentsStudentFormDialog.eduForm.daytime" },
  { value: "evening", labelKey: "studentsStudentFormDialog.eduForm.evening" },
  { value: "correspondence", labelKey: "studentsStudentFormDialog.eduForm.correspondence" },
  { value: "distance", labelKey: "studentsStudentFormDialog.eduForm.distance" },
] as const;
const DEGREE_TYPES = [
  { value: "bachelor", labelKey: "studentsStudentFormDialog.degreeType.bachelor" },
  { value: "master", labelKey: "studentsStudentFormDialog.degreeType.master" },
  { value: "phd", labelKey: "studentsStudentFormDialog.degreeType.phd" },
] as const;
const STUDENT_STATUSES = [
  { value: "studying", labelKey: "studentsStudentFormDialog.studentStatus.studying" },
  { value: "graduated", labelKey: "studentsStudentFormDialog.studentStatus.graduated" },
  { value: "expelled", labelKey: "studentsStudentFormDialog.studentStatus.expelled" },
  { value: "academic_leave", labelKey: "studentsStudentFormDialog.studentStatus.academicLeave" },
] as const;

/** Select'dagi "tanlanmagan" qiymati — Radix Select bo'sh satrni qabul qilmaydi. */
const NONE = "__none__";

const intInRange = (value: string, min: number, max: number) =>
  /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max;

/** Telefon: ixtiyoriy "+", raqamlar, bo'shliq/tire/qavslar; 9–15 ta raqam (backend max 20 belgi). */
function isValidPhone(value: string): boolean {
  if (!/^\+?[\d\s()-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "").length;
  return digits >= 9 && digits <= 15;
}

/** `initialPhone` — mavjud yozuvdagi telefon: eski formatdagi raqam tahrirlashni bloklamasin. */
const makeSchema = (t: TFunction, isEdit: boolean, initialPhone = "") => {
  const maxChars = (n: number) => t("adminValidation.maxChars", { n });
  return z.object({
    hemis_id: z
      .string()
      .trim()
      .min(1, t("studentsStudentFormDialog.hemisIdRequired"))
      .min(4, t("studentsStudentFormDialog.hemisIdMin"))
      // Backend: StudentCreate max 20, StudentUpdate max 32
      .max(isEdit ? 32 : 20, maxChars(isEdit ? 32 : 20)),
    last_name: z
      .string()
      .trim()
      .min(1, t("studentsStudentFormDialog.lastNameRequired"))
      .max(100, maxChars(100)),
    first_name: z
      .string()
      .trim()
      .min(1, t("studentsStudentFormDialog.firstNameRequired"))
      .max(100, maxChars(100)),
    middle_name: z.string().trim().max(100, maxChars(100)),
    faculty_id: z.string(),
    direction_id: z.string(),
    group_id: z.string().min(1, t("studentsStudentFormDialog.groupRequired")),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || z.email().safeParse(v).success, {
        message: t("studentsStudentFormDialog.emailInvalid"),
      }),
    phone: z
      .string()
      .trim()
      .max(20, maxChars(20))
      .refine((v) => v === "" || v === initialPhone.trim() || isValidPhone(v), {
        message: t("studentsStudentFormDialog.phoneInvalid"),
      }),
    gender: z.enum([NONE, "male", "female"]),
    region: z.string().trim().max(100, maxChars(100)),
    district: z.string().trim().max(100, maxChars(100)),
    education_form: z.enum([NONE, "daytime", "evening", "correspondence", "distance"]),
    degree_type: z.enum([NONE, "bachelor", "master", "phd"]),
    education_language: z.string().trim().max(20, maxChars(20)),
    current_semester: z
      .string()
      .trim()
      .refine((v) => v === "" || intInRange(v, 1, 8), {
        message: t("adminValidation.intRange", { min: 1, max: 8 }),
      }),
    enrollment_year: z
      .string()
      .trim()
      .refine((v) => v === "" || intInRange(v, 2000, 2100), {
        message: t("adminValidation.intRange", { min: 2000, max: 2100 }),
      }),
    status: z.enum([NONE, "studying", "graduated", "expelled", "academic_leave"]),
    is_graduating: z.boolean(),
  });
};

type Values = z.infer<ReturnType<typeof makeSchema>>;

function toFormValues(student: Student | null | undefined): Values {
  return {
    hemis_id: student?.hemis_id ?? "",
    last_name: student?.last_name ?? "",
    first_name: student?.first_name ?? "",
    middle_name: student?.middle_name ?? "",
    faculty_id: student?.faculty_id ?? "",
    direction_id: student?.direction_id ?? "",
    group_id: student?.group_id ?? "",
    email: student?.email ?? "",
    phone: student?.phone ?? "",
    gender: student?.gender ?? NONE,
    region: student?.region ?? "",
    district: student?.district ?? "",
    education_form: student?.education_form ?? NONE,
    degree_type: student?.degree_type ?? NONE,
    education_language: student?.education_language ?? "",
    current_semester: student?.current_semester ? String(student.current_semester) : "",
    enrollment_year: student?.enrollment_year ? String(student.enrollment_year) : "",
    status: student?.status ?? NONE,
    is_graduating: student?.is_graduating ?? false,
  };
}

const orNull = <T extends string>(value: T | typeof NONE): T | null =>
  value === NONE ? null : (value as T);

export function StudentFormDialog({ open, student, onClose }: Props) {
  const { t } = useTranslation();
  const isEdit = !!student;
  const formId = useId();
  const create = useCreateStudent();
  const update = useUpdateStudent();

  const initialPhone = student?.phone ?? "";
  const schema = useMemo(
    () => makeSchema(t, isEdit, initialPhone),
    [t, isEdit, initialPhone],
  );
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(null),
  });

  // Faqat ochilganda (yoki boshqa talaba uchun) to'ldiriladi — fon yangilanishi kiritilayotgan
  // o'zgarishlarni o'chirib yubormasin.
  const initializedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = open ? (student?.id ?? "new") : null;
    if (key === initializedFor.current) return;
    initializedFor.current = key;
    if (open) form.reset(toFormValues(student));
  }, [open, student, form]);

  // Kaskad: fakultet → yo'nalish → guruh (ro'yxatlar to'liq yuklanadi, qirqilmaydi)
  const facultyId = form.watch("faculty_id");
  const directionId = form.watch("direction_id");
  const faculties = useAllFaculties();
  const directions = useAllDirections(facultyId || undefined, { enabled: !!facultyId });
  const groups = useAllGroups(
    { directionId: directionId || undefined },
    { enabled: !!directionId },
  );

  const directionOptions: SearchableOption[] = useMemo(
    () => (directions.data ?? []).map((d) => ({ value: d.id, label: d.name, hint: d.code })),
    [directions.data],
  );
  const groupOptions: SearchableOption[] = useMemo(
    () =>
      (groups.data ?? [])
        .map((g) => ({
          value: g.id,
          label: t("studentsStudentFormDialog.groupOption", { name: g.name, course: g.course }),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [groups.data, t],
  );

  const onSubmit = async (v: Values) => {
    const common = {
      first_name: v.first_name,
      last_name: v.last_name,
      middle_name: v.middle_name || null,
      email: v.email || null,
      phone: v.phone || null,
      gender: orNull(v.gender),
      region: v.region || null,
      district: v.district || null,
      group_id: v.group_id,
      current_semester: v.current_semester ? Number(v.current_semester) : null,
      enrollment_year: v.enrollment_year ? Number(v.enrollment_year) : null,
      is_graduating: v.is_graduating,
      education_language: v.education_language || null,
      education_form: orNull(v.education_form),
      degree_type: orNull(v.degree_type),
    };
    try {
      if (student) {
        const data: StudentUpdatePayload = {
          ...common,
          hemis_id: v.hemis_id,
          status: orNull(v.status) ?? undefined,
        };
        await update.mutateAsync({ id: student.id, data });
        toast.success(t("studentsStudentFormDialog.updatedToast"));
      } else {
        const payload: StudentCreatePayload = { ...common, hemis_id: v.hemis_id };
        const created = await create.mutateAsync(payload);
        toast.success(
          t("studentsStudentFormDialog.createdToast", { username: created.username }),
          { duration: 12000 },
        );
      }
      onClose();
    } catch (e) {
      await applyServerFieldErrors(form, e);
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("studentsStudentFormDialog.editTitle")
              : t("studentsStudentFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("studentsStudentFormDialog.editDescription")
              : t("studentsStudentFormDialog.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(onSubmit, () => toast.error(t("common.formInvalid")))}
            className="grid gap-4 sm:grid-cols-2"
            noValidate
          >
            {!isEdit && (
              <div className="sm:col-span-2">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {t("studentsStudentFormDialog.autoCredentialsInfo")}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Amaliyot ID — yaratishda ham, tahrirlashda ham (import xato ID bilan
                kelsa admin tuzata olsin; unique — band bo'lsa 409 chiqadi) */}
            <FormField
              control={form.control}
              name="hemis_id"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t("studentsStudentFormDialog.hemisId")} *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="354231100489" autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("studentsStudentFormDialog.lastName")} *</FormLabel>
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
                  <FormLabel>{t("studentsStudentFormDialog.firstName")} *</FormLabel>
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
                  <FormLabel>{t("studentsStudentFormDialog.middleName")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Akademik */}
            <FormField
              control={form.control}
              name="faculty_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.faculty")} *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue("direction_id", "");
                      form.setValue("group_id", "");
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("studentsStudentFormDialog.selectPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
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
              name="direction_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.direction")} *</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value || null}
                      onChange={(v) => {
                        field.onChange(v ?? "");
                        form.setValue("group_id", "");
                      }}
                      options={directionOptions}
                      loading={!!facultyId && directions.isPending}
                      disabled={!facultyId}
                      selectedLabel={student?.direction_id === field.value ? student?.direction_name : null}
                      placeholder={
                        facultyId
                          ? t("studentsStudentFormDialog.selectPlaceholder")
                          : t("studentsStudentFormDialog.facultyFirst")
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="group_id"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t("common.group")} *</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value || null}
                      onChange={(v) => field.onChange(v ?? "")}
                      options={groupOptions}
                      loading={!!directionId && groups.isPending}
                      disabled={!directionId}
                      selectedLabel={student?.group_id === field.value ? student?.group_name : null}
                      placeholder={
                        directionId
                          ? t("studentsStudentFormDialog.selectPlaceholder")
                          : t("studentsStudentFormDialog.directionFirst")
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Aloqa */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("studentsStudentFormDialog.email")}</FormLabel>
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
                  <FormLabel>{t("studentsStudentFormDialog.phone")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" placeholder="+998901234567" autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Shaxsiy */}
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("studentsStudentFormDialog.gender")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("studentsStudentFormDialog.notSpecified")}</SelectItem>
                      <SelectItem value="male">{t("studentsStudentFormDialog.male")}</SelectItem>
                      <SelectItem value="female">{t("studentsStudentFormDialog.female")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("studentsStudentFormDialog.region")}</FormLabel>
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
                  <FormLabel>{t("studentsStudentFormDialog.district")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ta'lim ma'lumotlari */}
            <FormField
              control={form.control}
              name="education_form"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("studentsStudentFormDialog.educationFormLabel")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("studentsStudentFormDialog.notSpecified")}</SelectItem>
                      {EDU_FORMS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {t(f.labelKey)}
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
              name="degree_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("studentsStudentFormDialog.degreeTypeLabel")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("studentsStudentFormDialog.notSpecified")}</SelectItem>
                      {DEGREE_TYPES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {t(d.labelKey)}
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
              name="education_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("studentsStudentFormDialog.educationLanguageLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("studentsStudentFormDialog.educationLanguagePlaceholder")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="current_semester"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.semester")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" inputMode="numeric" min={1} max={8} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Qabul yili — yaratishda ham, tahrirlashda ham */}
            <FormField
              control={form.control}
              name="enrollment_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("studentsStudentFormDialog.enrollmentYear")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      inputMode="numeric"
                      min={2000}
                      max={2100}
                      placeholder="2022"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEdit && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.status")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("studentsStudentFormDialog.selectPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STUDENT_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {t(s.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("studentsStudentFormDialog.statusHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="is_graduating"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0 sm:col-span-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-primary"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    {t("studentsStudentFormDialog.isGraduating")}
                  </FormLabel>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form={formId} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? t("common.save") : t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
