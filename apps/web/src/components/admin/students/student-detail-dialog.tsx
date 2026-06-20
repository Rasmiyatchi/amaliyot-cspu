import { HTTPError } from "ky";
import { Pencil, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
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
import type { Student } from "@/lib/api/types";

const EDUCATION_FORM_LABEL = {
  daytime: "Kunduzgi",
  evening: "Kechki",
  correspondence: "Sirtqi",
  distance: "Masofaviy",
};

const DEGREE_LABEL = { bachelor: "Bakalavr", master: "Magistr", phd: "PhD" };

const GENDER_LABEL = { male: "Erkak", female: "Ayol" };

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
  const updateCreds = useUpdateStudentCredentials();
  const deleteStudent = useDeleteStudent();
  const resetDevice = useResetStudentDevice();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleResetDevice = async () => {
    if (!student) return;
    if (!confirm("Talabaning bog'langan qurilmasini o'chirishni tasdiqlang? Shundan keyin u yangi qurilmadan kira oladi.")) return;
    try {
      await resetDevice.mutateAsync(student.id);
      toast.success("Qurilma o'chirildi — talaba yangi qurilmadan kira oladi");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleDelete = async () => {
    if (!student) return;
    try {
      await deleteStudent.mutateAsync(student.id);
      toast.success("Talaba o'chirildi");
      setConfirmDelete(false);
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
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
              <DialogDescription>To'liq talaba ma'lumoti</DialogDescription>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Tahrirlash
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  O'chirish
                </Button>
              </div>
            </DialogHeader>

            <div className="grid gap-6 md:grid-cols-2">
              <Section title="Shaxsiy ma'lumot">
                <Field
                  label="Jinsi"
                  value={student.gender ? GENDER_LABEL[student.gender] : null}
                />
              </Section>

              <Section title="Aloqa">
                <Field label="Telefon" value={student.phone} />
                <Field label="Email" value={student.email} />
                <Field label="Viloyat" value={student.region} />
                <Field label="Tuman" value={student.district} />
              </Section>

              <Section title="Akademik">
                <Field
                  label="Yo'nalish"
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
                <Field label="Fakultet" value={student.faculty_name} />
                <Field label="Guruh" value={student.group_name} />
                <Field label="Kurs" value={student.course ? `${student.course}-kurs` : null} />
                <Field
                  label="Joriy semestr"
                  value={student.current_semester ? `${student.current_semester}-semestr` : null}
                />
                <Field
                  label="Bitiruvchi"
                  value={student.is_graduating ? "Ha" : "Yo'q"}
                />
              </Section>

              <Section title="Ta'lim turi">
                <Field
                  label="Ta'lim shakli"
                  value={
                    student.education_form ? EDUCATION_FORM_LABEL[student.education_form] : null
                  }
                />
                <Field
                  label="Daraja"
                  value={student.degree_type ? DEGREE_LABEL[student.degree_type] : null}
                />
                <Field label="Ta'lim tili" value={student.education_language} />
                <Field label="Qabul yili" value={student.enrollment_year} />
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
                Bog'langan qurilma
              </h3>
              {student.device_id ? (
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                  <div className="min-w-0 text-sm">
                    <div className="truncate">{student.device_label ?? "Noma'lum qurilma"}</div>
                    <div className="text-xs text-muted-foreground">
                      Bog'langan:{" "}
                      {student.device_bound_at
                        ? new Date(student.device_bound_at).toLocaleString("uz-UZ")
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
                    Qurilmani o'chirish
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Qurilma bog'lanmagan — talaba keyingi kirishda istalgan qurilmaga bog'lanadi.
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Yaratilgan: {new Date(student.created_at).toLocaleString("uz-UZ")}
              {student.last_login_at && (
                <> · Oxirgi kirish: {new Date(student.last_login_at).toLocaleString("uz-UZ")}</>
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
            title="Talabani o'chirish"
            description={`${student.full_name} ni va u bilan bog'liq foydalanuvchi yozuvini o'chirishni tasdiqlang. Bu amal qaytarilmaydi.`}
            confirmText="Ha, o'chirish"
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
