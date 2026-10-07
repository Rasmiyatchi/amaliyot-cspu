import { HTTPError } from "ky";
import { Ban, Pencil, ShieldOff, Smartphone, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  RestrictionFormDialog,
  type RestrictionPreset,
} from "@/components/admin/access-restrictions/restriction-form-dialog";
import { CredentialsSection } from "@/components/admin/credentials-section";
import { formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { describeRequestError } from "@/components/attendance/request-error";
import { StudentFormDialog } from "@/components/admin/students/student-form-dialog";
import { StudentStatusBadge } from "@/components/admin/students/students-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  useDeleteStudent,
  useResetStudentDevice,
  useStudent,
  useUpdateStudentCredentials,
} from "@/lib/api/students";
import { dateLocale } from "@/i18n";
import {
  useAccessRestrictions,
  useDeactivateAccessRestriction,
} from "@/lib/api/access-restrictions";
import type { Student } from "@/lib/api/types";
import type { DeviceInfo } from "@/lib/device-id";
import { useAuthStore } from "@/stores/auth";

const EDUCATION_FORM_LABEL = {
  daytime: "studentsStudentDetailDialog.educationForm.daytime",
  evening: "studentsStudentDetailDialog.educationForm.evening",
  correspondence: "studentsStudentDetailDialog.educationForm.correspondence",
  distance: "studentsStudentDetailDialog.educationForm.distance",
};

const DEGREE_LABEL = {
  bachelor: "studentsStudentDetailDialog.degree.bachelor",
  master: "studentsStudentDetailDialog.degree.master",
  phd: "studentsStudentDetailDialog.degree.phd",
};

const GENDER_LABEL = {
  male: "studentsStudentDetailDialog.gender.male",
  female: "studentsStudentDetailDialog.gender.female",
};

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-1 sm:gap-2 text-sm min-w-0">
      <dt className="text-muted-foreground min-w-0 shrink-0">{label}</dt>
      <dd className="min-w-0 break-words [overflow-wrap:anywhere]">
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 min-w-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <dl className="space-y-1.5 min-w-0">{children}</dl>
    </div>
  );
}

/** Backend `device_info`ni JSON sifatida qaytaradi — maydonlar yo'q bo'lishi mumkin. */
function str(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  return null;
}

function joinParts(...parts: Array<string | null>): string | null {
  const filtered = parts.filter((p): p is string => !!p);
  return filtered.length ? filtered.join(" ") : null;
}

type DeviceFact = { key: string; label: string; value: string };

function deviceFacts(
  info: Partial<DeviceInfo>,
  t: (key: string, opts?: Record<string, unknown>) => string,
): DeviceFact[] {
  const facts: Array<[string, string, string | null]> = [
    [
      "platform",
      t("studentsStudentDetailDialog.device.platform", { defaultValue: "Platforma" }),
      joinParts(str(info.platform), str(info.platform_version)),
    ],
    [
      "model",
      t("studentsStudentDetailDialog.device.model", { defaultValue: "Model" }),
      str(info.model),
    ],
    [
      "browser",
      t("studentsStudentDetailDialog.device.browser", { defaultValue: "Brauzer" }),
      joinParts(str(info.browser) ?? str(info.brand), str(info.browser_version)),
    ],
    [
      "screen",
      t("studentsStudentDetailDialog.device.screen", { defaultValue: "Ekran" }),
      str(info.screen),
    ],
    [
      "timezone",
      t("studentsStudentDetailDialog.device.timezone", { defaultValue: "Vaqt mintaqasi" }),
      str(info.timezone),
    ],
    [
      "language",
      t("studentsStudentDetailDialog.device.language", { defaultValue: "Til" }),
      str(info.language),
    ],
  ];
  return facts
    .filter((f): f is [string, string, string] => f[2] !== null)
    .map(([key, label, value]) => ({ key, label, value }));
}

type DeviceCardProps = {
  student: Student;
  isPending: boolean;
  onReset: () => void;
};

function DeviceCard({ student, isPending, onReset }: DeviceCardProps) {
  const { t } = useTranslation();
  const info = student.device_info ?? null;
  const facts = info ? deviceFacts(info, t) : [];
  const label =
    student.device_label?.trim() ||
    joinParts(str(info?.platform), str(info?.model), str(info?.browser)) ||
    t("studentsStudentDetailDialog.unknownDevice");

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium break-words [overflow-wrap:anywhere] text-sm">{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t("studentsStudentDetailDialog.boundAt")}{" "}
              {student.device_bound_at
                ? new Date(student.device_bound_at).toLocaleString(dateLocale())
                : "—"}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 text-destructive hover:bg-destructive/10 self-start"
          onClick={onReset}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
          {t("studentsStudentDetailDialog.resetDevice")}
        </Button>
      </div>

      {facts.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-border/60 pt-3 min-w-0">
          {facts.map((f) => (
            <div key={f.key} className="flex items-baseline justify-between gap-3 min-w-0">
              <dt className="text-muted-foreground shrink-0">{f.label}</dt>
              <dd className="text-right font-medium break-words [overflow-wrap:anywhere] min-w-0">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {student.device_id && (
        <div className="text-[11px] text-muted-foreground break-all">
          ID: <span className="font-mono">{student.device_id}</span>
        </div>
      )}
    </div>
  );
}

type Props = {
  /** Ro'yxatdagi qator — darhol ko'rsatish uchun; keyin serverdan yangi ma'lumot olinadi */
  student: Student | null;
  onClose: () => void;
  /** O'chirilgandan keyin — ro'yxat sahifasi tanlovdan chiqarib qo'yishi uchun */
  onDeleted?: (id: string) => void;
};

export function StudentDetailDialog({ student: row, onClose, onDeleted }: Props) {
  const { t } = useTranslation();
  // Tahrirlash / login / qurilma o'zgargach dialog eski qatorni emas, yangi holatni ko'rsatsin:
  // mutatsiyalar detal keshini server javobi bilan yangilaydi.
  const detail = useStudent(row?.id ?? null);
  const student = row ? (detail.data ?? row) : null;
  const updateCreds = useUpdateStudentCredentials();
  const deleteStudent = useDeleteStudent();
  const resetDevice = useResetStudentDevice();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Kirish cheklovi — faqat super admin ko'radi va boshqaradi
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "super_admin");
  const restrictions = useAccessRestrictions(true, isSuperAdmin && !!student);
  const liftRestriction = useDeactivateAccessRestriction();
  const [restrictPreset, setRestrictPreset] = useState<RestrictionPreset | null>(null);
  // Shaxsiy cheklov ustun; bo'lmasa — talaba guruhiga qo'yilgan cheklov (serverdagi tartib bilan bir xil)
  const activeRestriction = student
    ? ((restrictions.data ?? []).find((r) => r.user_id === student.user_id) ??
      (restrictions.data ?? []).find(
        (r) => r.target_type === "group" && !!student.group_id && r.group_id === student.group_id,
      ))
    : undefined;
  const isGroupRestriction = activeRestriction?.target_type === "group";

  const handleLiftRestriction = async () => {
    if (!activeRestriction) return;
    try {
      await liftRestriction.mutateAsync(activeRestriction.id);
      toast.success(t("studentsStudentDetailDialog.restrictionLifted"));
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const handleResetDevice = async () => {
    if (!student) return;
    try {
      await resetDevice.mutateAsync(student.id);
      toast.success(t("studentsStudentDetailDialog.deviceReset"));
      setConfirmReset(false);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!student) return;
    try {
      await deleteStudent.mutateAsync(student.id);
      toast.success(t("studentsStudentDetailDialog.studentDeleted"));
      setConfirmDelete(false);
      onDeleted?.(student.id);
      onClose();
    } catch (e) {
      if (e instanceof HTTPError) {
        // 409: amaliyot/ariza tarixi bor — server sababini va yechimini (statusni o'zgartirish) aytadi
        if (e.response.status === 409) setConfirmDelete(false);
        toast.error(e.message, { duration: 10_000 });
      } else {
        toast.error(t("common.error"));
      }
    }
  };

  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        {student && (
          <>
            <DialogHeader className="min-w-0">
              <DialogTitle className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {student.last_name[0]}
                  {student.first_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-semibold text-base sm:text-lg">
                    {student.full_name}
                  </div>
                  <div className="mt-0.5 text-xs font-normal text-muted-foreground break-all">
                    ID: {student.hemis_id} · {student.username}
                  </div>
                </div>
                <div className="shrink-0">
                  <StudentStatusBadge status={student.status} />
                </div>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {t("studentsStudentDetailDialog.description")}
              </DialogDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  {t("common.edit")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("common.delete")}
                </Button>
              </div>
            </DialogHeader>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 min-w-0">
              <Section title={t("studentsStudentDetailDialog.sectionPersonal")}>
                <Field
                  label={t("studentsStudentDetailDialog.genderLabel")}
                  value={student.gender ? t(GENDER_LABEL[student.gender]) : null}
                />
              </Section>

              <Section title={t("studentsStudentDetailDialog.sectionContact")}>
                <Field label={t("studentsStudentDetailDialog.phone")} value={student.phone} />
                <Field label={t("studentsStudentDetailDialog.email")} value={student.email} />
                <Field label={t("studentsStudentDetailDialog.region")} value={student.region} />
                <Field label={t("studentsStudentDetailDialog.district")} value={student.district} />
              </Section>

              <Section title={t("studentsStudentDetailDialog.sectionAcademic")}>
                <Field
                  label={t("common.direction")}
                  value={
                    student.direction_code ? (
                      <span className="inline-flex flex-wrap items-center gap-1">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {student.direction_code}
                        </Badge>{" "}
                        <span>{student.direction_name}</span>
                      </span>
                    ) : null
                  }
                />
                <Field label={t("common.faculty")} value={student.faculty_name} />
                <Field label={t("common.group")} value={student.group_name} />
                <Field
                  label={t("common.course")}
                  value={student.course ? t("common.courseN", { n: student.course }) : null}
                />
                <Field
                  label={t("studentsStudentDetailDialog.currentSemester")}
                  value={
                    student.current_semester
                      ? t("studentsStudentDetailDialog.semesterN", { n: student.current_semester })
                      : null
                  }
                />
                <Field
                  label={t("studentsStudentDetailDialog.graduating")}
                  value={student.is_graduating ? t("common.yes") : t("common.no")}
                />
              </Section>

              <Section title={t("studentsStudentDetailDialog.sectionEducation")}>
                <Field
                  label={t("studentsStudentDetailDialog.educationFormLabel")}
                  value={
                    student.education_form ? t(EDUCATION_FORM_LABEL[student.education_form]) : null
                  }
                />
                <Field
                  label={t("studentsStudentDetailDialog.degreeLabel")}
                  value={student.degree_type ? t(DEGREE_LABEL[student.degree_type]) : null}
                />
                <Field
                  label={t("studentsStudentDetailDialog.educationLanguage")}
                  value={student.education_language}
                />
                <Field
                  label={t("studentsStudentDetailDialog.enrollmentYear")}
                  value={student.enrollment_year}
                />
              </Section>
            </div>

            <Separator />

            <CredentialsSection
              key={student.id}
              currentUsername={student.username}
              isPending={updateCreds.isPending}
              onSave={(payload) => updateCreds.mutateAsync({ id: student.id, data: payload })}
            />

            <Separator />

            {/* Qurilma bog'lash (bitta-qurilma login) */}
            <div className="space-y-2 min-w-0">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Smartphone className="h-3.5 w-3.5" />
                {t("studentsStudentDetailDialog.boundDevice")}
              </h3>
              {student.device_id ? (
                <DeviceCard
                  student={student}
                  isPending={resetDevice.isPending}
                  onReset={() => setConfirmReset(true)}
                />
              ) : (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  {t("studentsStudentDetailDialog.noDevice")}
                </div>
              )}
            </div>

            {isSuperAdmin && (
              <>
                <Separator />
                {/* Tizimga kirish — shaxsiy cheklov */}
                <div className="space-y-2 min-w-0">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ShieldOff className="h-3.5 w-3.5" />
                    {t("studentsStudentDetailDialog.accessTitle")}
                  </h3>
                  {activeRestriction ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium text-destructive">
                          {t(
                            isGroupRestriction
                              ? "studentsStudentDetailDialog.accessRestrictedGroup"
                              : "studentsStudentDetailDialog.accessRestricted",
                            {
                              mode: t(`adminAccessRestrictions.mode.${activeRestriction.mode}`),
                              group: activeRestriction.target_name ?? student.group_name ?? "",
                            },
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activeRestriction.ends_at
                            ? t("studentsStudentDetailDialog.accessUntil", {
                                date: formatTashkentDateTime(
                                  activeRestriction.ends_at,
                                  dateLocale(),
                                ),
                              })
                            : t("adminAccessRestrictions.noEnd")}
                          {activeRestriction.message && ` · ${activeRestriction.message}`}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleLiftRestriction()}
                        disabled={liftRestriction.isPending}
                        title={
                          isGroupRestriction
                            ? t("studentsStudentDetailDialog.liftGroupHint", {
                                count: activeRestriction.affected_count ?? 0,
                              })
                            : undefined
                        }
                      >
                        {t(
                          isGroupRestriction
                            ? "studentsStudentDetailDialog.liftGroupRestriction"
                            : "studentsStudentDetailDialog.liftRestriction",
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                      <span className="text-muted-foreground">
                        {t("studentsStudentDetailDialog.accessOpen")}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setRestrictPreset({
                            kind: "student",
                            id: student.id,
                            label: student.full_name,
                          })
                        }
                      >
                        <Ban className="h-4 w-4 text-destructive" />
                        {t("studentsStudentDetailDialog.restrictAccess")}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="text-xs text-muted-foreground">
              {t("studentsStudentDetailDialog.createdAt", {
                date: new Date(student.created_at).toLocaleString(dateLocale()),
              })}
              {student.last_login_at && (
                <>
                  {" · "}
                  {t("studentsStudentDetailDialog.lastLogin", {
                    date: new Date(student.last_login_at).toLocaleString(dateLocale()),
                  })}
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
      {student && (
        <>
          <RestrictionFormDialog
            open={!!restrictPreset}
            preset={restrictPreset}
            onClose={() => setRestrictPreset(null)}
          />
          <StudentFormDialog open={editOpen} student={student} onClose={() => setEditOpen(false)} />
          <ConfirmDialog
            open={confirmDelete}
            title={t("studentsStudentDetailDialog.deleteTitle")}
            description={t("studentsStudentDetailDialog.deleteDescription", {
              name: student.full_name,
            })}
            confirmText={t("studentsStudentDetailDialog.deleteConfirmText")}
            variant="destructive"
            onConfirm={handleDelete}
            onClose={() => setConfirmDelete(false)}
            isPending={deleteStudent.isPending}
          />
          <ConfirmDialog
            open={confirmReset}
            title={t("studentsStudentDetailDialog.device.resetTitle", {
              defaultValue: "Qurilmani o'chirish",
            })}
            description={t("studentsStudentDetailDialog.resetDeviceConfirm")}
            confirmText={t("studentsStudentDetailDialog.resetDevice")}
            variant="destructive"
            onConfirm={handleResetDevice}
            onClose={() => setConfirmReset(false)}
            isPending={resetDevice.isPending}
          />
        </>
      )}
    </Dialog>
  );
}
