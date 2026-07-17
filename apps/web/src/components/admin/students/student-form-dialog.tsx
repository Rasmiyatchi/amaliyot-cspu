import { HTTPError } from "ky";
import { Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFaculties, useDirections, useGroups } from "@/lib/api/academic";
import {
  useCreateStudent,
  useUpdateStudent,
  type StudentCreatePayload,
  type StudentUpdatePayload,
} from "@/lib/api/students";
import type { Student, UUID } from "@/lib/api/types";

type Props = {
  open: boolean;
  /** Mavjud talaba — bo'lsa edit, bo'lmasa create. */
  student?: Student | null;
  onClose: () => void;
};

type FormState = {
  hemis_id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
  phone: string;
  gender: "" | "male" | "female";
  region: string;
  district: string;
  faculty_id: string;
  direction_id: string;
  group_id: string;
  // Akademik/ta'lim ma'lumotlari — backend allaqachon qabul qiladi
  current_semester: string;
  enrollment_year: string;
  education_language: string;
  education_form: string;
  degree_type: string;
  is_graduating: boolean;
  status: string;
};

const EMPTY: FormState = {
  hemis_id: "",
  first_name: "",
  last_name: "",
  middle_name: "",
  email: "",
  phone: "",
  gender: "",
  region: "",
  district: "",
  faculty_id: "",
  direction_id: "",
  group_id: "",
  current_semester: "",
  enrollment_year: "",
  education_language: "",
  education_form: "",
  degree_type: "",
  is_graduating: false,
  status: "",
};

const EDU_FORMS = [
  { value: "daytime", labelKey: "studentsStudentFormDialog.eduForm.daytime" },
  { value: "evening", labelKey: "studentsStudentFormDialog.eduForm.evening" },
  { value: "correspondence", labelKey: "studentsStudentFormDialog.eduForm.correspondence" },
  { value: "distance", labelKey: "studentsStudentFormDialog.eduForm.distance" },
];
const DEGREE_TYPES = [
  { value: "bachelor", labelKey: "studentsStudentFormDialog.degreeType.bachelor" },
  { value: "master", labelKey: "studentsStudentFormDialog.degreeType.master" },
  { value: "phd", labelKey: "studentsStudentFormDialog.degreeType.phd" },
];
const STUDENT_STATUSES = [
  { value: "studying", labelKey: "studentsStudentFormDialog.studentStatus.studying" },
  { value: "graduated", labelKey: "studentsStudentFormDialog.studentStatus.graduated" },
  { value: "expelled", labelKey: "studentsStudentFormDialog.studentStatus.expelled" },
  { value: "academic_leave", labelKey: "studentsStudentFormDialog.studentStatus.academicLeave" },
];

export function StudentFormDialog({ open, student, onClose }: Props) {
  const { t } = useTranslation();
  const isEdit = !!student;
  const [form, setForm] = useState<FormState>(EMPTY);
  const create = useCreateStudent();
  const update = useUpdateStudent();

  // Cascade: fakultet → yo'nalish → guruh
  const facultiesQ = useFaculties(1, 100);
  const directionsQ = useDirections(form.faculty_id || undefined, 1, 200);
  const groupsQ = useGroups({ directionId: (form.direction_id || undefined) as UUID | undefined }, 1, 200);

  // Init form when student prop changes
  useEffect(() => {
    if (!open) return;
    if (student) {
      setForm({
        hemis_id: student.hemis_id,
        first_name: student.first_name,
        last_name: student.last_name,
        middle_name: student.middle_name ?? "",
        email: student.email ?? "",
        phone: student.phone ?? "",
        gender: (student.gender as "male" | "female") ?? "",
        region: student.region ?? "",
        district: student.district ?? "",
        faculty_id: student.faculty_id ?? "",
        direction_id: student.direction_id ?? "",
        group_id: student.group_id ?? "",
        current_semester: student.current_semester ? String(student.current_semester) : "",
        enrollment_year: student.enrollment_year ? String(student.enrollment_year) : "",
        education_language: student.education_language ?? "",
        education_form: student.education_form ?? "",
        degree_type: student.degree_type ?? "",
        is_graduating: student.is_graduating ?? false,
        status: student.status ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, student]);

  const set = (k: keyof FormState, v: string) =>
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "faculty_id") {
        next.direction_id = "";
        next.group_id = "";
      }
      if (k === "direction_id") {
        next.group_id = "";
      }
      return next;
    });

  const validate = (): string | null => {
    if (!form.first_name.trim()) return t("studentsStudentFormDialog.firstNameRequired");
    if (!form.last_name.trim()) return t("studentsStudentFormDialog.lastNameRequired");
    if (!form.group_id) return t("studentsStudentFormDialog.groupRequired");
    // Amaliyot ID endi tahrirlashda ham o'zgartiriladi
    if (!form.hemis_id.trim()) return t("studentsStudentFormDialog.hemisIdRequired");
    if (form.hemis_id.trim().length < 4) return t("studentsStudentFormDialog.hemisIdMin");
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    try {
      if (isEdit && student) {
        await update.mutateAsync({
          id: student.id,
          data: {
            hemis_id: form.hemis_id.trim() || undefined,
            first_name: form.first_name,
            last_name: form.last_name,
            middle_name: form.middle_name || null,
            email: form.email || null,
            phone: form.phone || null,
            gender: form.gender || null,
            region: form.region || null,
            district: form.district || null,
            group_id: (form.group_id || undefined) as UUID | undefined,
            current_semester: form.current_semester ? Number(form.current_semester) : null,
            enrollment_year: form.enrollment_year ? Number(form.enrollment_year) : null,
            education_language: form.education_language || null,
            education_form: form.education_form || null,
            degree_type: form.degree_type || null,
            is_graduating: form.is_graduating,
            status: (form.status || undefined) as StudentUpdatePayload["status"],
          },
        });
        toast.success(t("studentsStudentFormDialog.updatedToast"));
      } else {
        const payload: StudentCreatePayload = {
          hemis_id: form.hemis_id.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          middle_name: form.middle_name.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          gender: form.gender || null,
          region: form.region.trim() || null,
          district: form.district.trim() || null,
          group_id: form.group_id as UUID,
        };
        const created = await create.mutateAsync(payload);
        toast.success(
          t("studentsStudentFormDialog.createdToast", { username: created.username }),
          { duration: 12000 },
        );
      }
      onClose();
    } catch (e) {
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

        <div className="grid gap-4 sm:grid-cols-2">
          {!isEdit && (
            <>
              <div className="sm:col-span-2">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {t("studentsStudentFormDialog.autoCredentialsInfo")}
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}

          {/* Amaliyot ID — yaratishda ham, tahrirlashda ham (import xato ID bilan
              kelsa admin tuzata olsin; unique — band bo'lsa 409 chiqadi) */}
          <div className="sm:col-span-2">
            <Label>{t("studentsStudentFormDialog.hemisId")} *</Label>
            <Input
              value={form.hemis_id}
              onChange={(e) => set("hemis_id", e.target.value)}
              placeholder="354231100489"
            />
          </div>

          {/* F.I.SH. */}
          <div>
            <Label>{t("studentsStudentFormDialog.lastName")} *</Label>
            <Input
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
            />
          </div>
          <div>
            <Label>{t("studentsStudentFormDialog.firstName")} *</Label>
            <Input
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("studentsStudentFormDialog.middleName")}</Label>
            <Input
              value={form.middle_name}
              onChange={(e) => set("middle_name", e.target.value)}
            />
          </div>

          {/* Akademik */}
          <div>
            <Label>{t("common.faculty")} *</Label>
            <Select value={form.faculty_id} onValueChange={(v) => set("faculty_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("studentsStudentFormDialog.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {(facultiesQ.data?.items ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("common.direction")} *</Label>
            <Select
              value={form.direction_id}
              onValueChange={(v) => set("direction_id", v)}
              disabled={!form.faculty_id}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    form.faculty_id
                      ? t("studentsStudentFormDialog.selectPlaceholder")
                      : t("studentsStudentFormDialog.facultyFirst")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(directionsQ.data?.items ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code} · {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("common.group")} *</Label>
            <Select
              value={form.group_id}
              onValueChange={(v) => set("group_id", v)}
              disabled={!form.direction_id}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    form.direction_id
                      ? t("studentsStudentFormDialog.selectPlaceholder")
                      : t("studentsStudentFormDialog.directionFirst")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(groupsQ.data?.items ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {t("studentsStudentFormDialog.groupOption", { name: g.name, course: g.course })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aloqa */}
          <div>
            <Label>{t("studentsStudentFormDialog.email")}</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <Label>{t("studentsStudentFormDialog.phone")}</Label>
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+998..."
            />
          </div>

          {/* Shaxsiy */}
          <div>
            <Label>{t("studentsStudentFormDialog.gender")}</Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("studentsStudentFormDialog.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t("studentsStudentFormDialog.male")}</SelectItem>
                <SelectItem value="female">{t("studentsStudentFormDialog.female")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("studentsStudentFormDialog.region")}</Label>
            <Input
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
            />
          </div>
          <div>
            <Label>{t("studentsStudentFormDialog.district")}</Label>
            <Input
              value={form.district}
              onChange={(e) => set("district", e.target.value)}
            />
          </div>

          {/* Ta'lim ma'lumotlari — backend allaqachon qabul qiladi */}
          <div>
            <Label>{t("studentsStudentFormDialog.educationFormLabel")}</Label>
            <Select
              value={form.education_form}
              onValueChange={(v) => set("education_form", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("studentsStudentFormDialog.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {EDU_FORMS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {t(f.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("studentsStudentFormDialog.degreeTypeLabel")}</Label>
            <Select value={form.degree_type} onValueChange={(v) => set("degree_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("studentsStudentFormDialog.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {DEGREE_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {t(d.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("studentsStudentFormDialog.educationLanguageLabel")}</Label>
            <Input
              value={form.education_language}
              onChange={(e) => set("education_language", e.target.value)}
              placeholder={t("studentsStudentFormDialog.educationLanguagePlaceholder")}
            />
          </div>
          <div>
            <Label>{t("common.semester")}</Label>
            <Input
              type="number"
              min={1}
              max={8}
              value={form.current_semester}
              onChange={(e) => set("current_semester", e.target.value)}
            />
          </div>
          <div>
            <Label>{t("studentsStudentFormDialog.enrollmentYear")}</Label>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={form.enrollment_year}
              onChange={(e) => set("enrollment_year", e.target.value)}
              placeholder="2022"
            />
          </div>
          {isEdit && (
            <div>
              <Label>{t("common.status")}</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("studentsStudentFormDialog.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {t(s.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-end sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.is_graduating}
                onChange={(e) => setForm((p) => ({ ...p, is_graduating: e.target.checked }))}
              />
              <span className="text-sm">{t("studentsStudentFormDialog.isGraduating")}</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? t("common.save") : t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
