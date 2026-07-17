import { HTTPError } from "ky";
import { Pencil, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CredentialsSection } from "@/components/admin/credentials-section";
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
  useUpdateStudentCredentials,
} from "@/lib/api/students";
import { dateLocale } from "@/i18n";
import type { Student } from "@/lib/api/types";

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

type Props = {
  student: Student | null;
  onClose: () => void;
};

export function StudentDetailDialog({ student, onClose }: Props) {
  const { t } = useTranslation();
  const updateCreds = useUpdateStudentCredentials();
  const deleteStudent = useDeleteStudent();
  const resetDevice = useResetStudentDevice();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleResetDevice = async () => {
    if (!student) return;
    if (!confirm(t("studentsStudentDetailDialog.resetDeviceConfirm"))) return;
    try {
      await resetDevice.mutateAsync(student.id);
      toast.success(t("studentsStudentDetailDialog.deviceReset"));
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
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {student && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {student.last_name[0]}
                  {student.first_name[0]}
                </div>
                <div className="flex-1">
                  <div>{student.full_name}</div>
                  <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                    ID: {student.hemis_id} · {student.username}
                  </div>
                </div>
                <StudentStatusBadge status={student.status} />
              </DialogTitle>
              <DialogDescription>{t("studentsStudentDetailDialog.description")}</DialogDescription>
              <div className="flex gap-2 pt-2">
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

            <div className="grid gap-6 md:grid-cols-2">
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
                      <>
                        <Badge variant="secondary" className="font-mono">
                          {student.direction_code}
                        </Badge>{" "}
                        {student.direction_name}
                      </>
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
              currentUsername={student.username}
              isPending={updateCreds.isPending}
              onSave={(payload) =>
                updateCreds.mutateAsync({ id: student.id, data: payload })
              }
            />

            <Separator />

            {/* Qurilma bog'lash (bitta-qurilma login) */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Smartphone className="h-3.5 w-3.5" />
                {t("studentsStudentDetailDialog.boundDevice")}
              </h3>
              {student.device_id ? (
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                  <div className="min-w-0 text-sm">
                    <div className="truncate">
                      {student.device_label ?? t("studentsStudentDetailDialog.unknownDevice")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("studentsStudentDetailDialog.boundAt")}{" "}
                      {student.device_bound_at
                        ? new Date(student.device_bound_at).toLocaleString(dateLocale())
                        : "—"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={handleResetDevice}
                    disabled={resetDevice.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("studentsStudentDetailDialog.resetDevice")}
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  {t("studentsStudentDetailDialog.noDevice")}
                </div>
              )}
            </div>

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
          <StudentFormDialog
            open={editOpen}
            student={student}
            onClose={() => setEditOpen(false)}
          />
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
        </>
      )}
    </Dialog>
  );
}
