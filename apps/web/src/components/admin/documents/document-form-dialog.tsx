import { FileText, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { usePracticeTypes } from "@/lib/api/practice-types";
import {
  uploadStandaloneFile,
  useCreateDocument,
  useUpdateDocument,
  type DocumentEntity,
  type DocumentKind,
} from "@/lib/api/documents";
import { useDirections } from "@/lib/api/academic";
import type { Attachment } from "@/lib/api/uploads";
import type { UUID } from "@/lib/api/types";

type Props = {
  open: boolean;
  document?: DocumentEntity | null;
  defaultKind?: DocumentKind;
  onClose: () => void;
};

const KIND_LABEL: Record<DocumentKind, string> = {
  regulation: "documentsDocumentFormDialog.kind.regulation",
  program: "documentsDocumentFormDialog.kind.program",
};

/** Ixtiyoriy maydonlar uchun "ko'rsatilmagan" qiymati (Radix Select bo'sh qiymatni qabul qilmaydi) */
const NONE = "__none__";
const COURSES = [1, 2, 3, 4, 5];

const EDU_FORMS = [
  { value: "daytime", labelKey: "studentsStudentFormDialog.eduForm.daytime" },
  { value: "evening", labelKey: "studentsStudentFormDialog.eduForm.evening" },
  { value: "correspondence", labelKey: "studentsStudentFormDialog.eduForm.correspondence" },
  { value: "distance", labelKey: "studentsStudentFormDialog.eduForm.distance" },
];

export function DocumentFormDialog({ open, document, defaultKind, onClose }: Props) {
  const { t } = useTranslation();
  const isEdit = !!document;
  const [kind, setKind] = useState<DocumentKind>("regulation");
  const [practiceTypeId, setPracticeTypeId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState(NONE);
  const [educationForm, setEducationForm] = useState(NONE);
  const [directionId, setDirectionId] = useState(NONE);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const create = useCreateDocument();
  const update = useUpdateDocument();
  const practiceTypes = usePracticeTypes();
  const directionsQ = useDirections(undefined, 1, 200);

  useEffect(() => {
    if (!open) return;
    if (document) {
      setKind(document.kind);
      setPracticeTypeId(document.practice_type_id ?? "");
      setTitle(document.title);
      setDescription(document.description ?? "");
      setCourse(document.course ? String(document.course) : NONE);
      setEducationForm(document.education_form ?? NONE);
      setDirectionId(document.direction_id ?? NONE);
      setAttachment(document.file_attachment);
    } else {
      setKind(defaultKind ?? "regulation");
      setPracticeTypeId("");
      setTitle("");
      setDescription("");
      setCourse(NONE);
      setEducationForm(NONE);
      setDirectionId(NONE);
      setAttachment(null);
    }
  }, [open, document, defaultKind]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const att = await uploadStandaloneFile(file);
      setAttachment(att);
      toast.success(t("documentsDocumentFormDialog.toasts.fileUploaded"));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("documentsDocumentFormDialog.errors.uploadError"),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t("documentsDocumentFormDialog.errors.titleRequired"));
      return;
    }
    if (kind === "program" && !practiceTypeId) {
      toast.error(t("documentsDocumentFormDialog.errors.practiceTypeRequired"));
      return;
    }
    if (!attachment) {
      toast.error(t("documentsDocumentFormDialog.errors.fileRequired"));
      return;
    }

    const optional = {
      course: course !== NONE ? Number(course) : null,
      education_form: educationForm !== NONE ? educationForm : null,
      direction_id: directionId !== NONE ? (directionId as UUID) : null,
    };

    try {
      if (isEdit && document) {
        await update.mutateAsync({
          id: document.id,
          data: {
            practice_type_id: practiceTypeId ? (practiceTypeId as UUID) : null,
            ...optional,
            title: title.trim(),
            description: description.trim() || null,
            file_attachment: attachment,
          },
        });
        toast.success(t("documentsDocumentFormDialog.toasts.updated"));
      } else {
        await create.mutateAsync({
          kind,
          practice_type_id: practiceTypeId ? (practiceTypeId as UUID) : null,
          ...optional,
          title: title.trim(),
          description: description.trim() || null,
          file_attachment: attachment,
        });
        toast.success(t("documentsDocumentFormDialog.toasts.created"));
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const busy = create.isPending || update.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("documentsDocumentFormDialog.editTitle")
              : t("documentsDocumentFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("documentsDocumentFormDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="doc-kind">{t("documentsDocumentFormDialog.kindLabel")} *</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as DocumentKind)}
              disabled={isEdit}
            >
              <SelectTrigger id="doc-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regulation">{t(KIND_LABEL.regulation)}</SelectItem>
                <SelectItem value="program">{t(KIND_LABEL.program)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kind === "program" && (
            <>
              <div>
                <Label htmlFor="doc-practice-type">{t("common.practiceType")} *</Label>
                <Select value={practiceTypeId} onValueChange={setPracticeTypeId}>
                  <SelectTrigger id="doc-practice-type">
                    <SelectValue
                      placeholder={t("documentsDocumentFormDialog.selectPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(practiceTypes.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="doc-course">{t("common.course")}</Label>
                  <Select value={course} onValueChange={setCourse}>
                    <SelectTrigger id="doc-course">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("documentsDocumentFormDialog.anyOption")}</SelectItem>
                      {COURSES.map((c) => (
                        <SelectItem key={c} value={String(c)}>
                          {t("common.courseN", { n: c })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="doc-edu-form">
                    {t("studentsStudentFormDialog.educationFormLabel")}
                  </Label>
                  <Select value={educationForm} onValueChange={setEducationForm}>
                    <SelectTrigger id="doc-edu-form">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("documentsDocumentFormDialog.anyOption")}</SelectItem>
                      {EDU_FORMS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {t(f.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="doc-direction">{t("common.direction")}</Label>
                <Select value={directionId} onValueChange={setDirectionId}>
                  <SelectTrigger id="doc-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("documentsDocumentFormDialog.anyOption")}</SelectItem>
                    {(directionsQ.data?.items ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.code} · {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="doc-title">{t("documentsDocumentFormDialog.titleLabel")} *</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("documentsDocumentFormDialog.titlePlaceholder")}
              maxLength={500}
            />
          </div>

          <div>
            <Label htmlFor="doc-description">
              {t("documentsDocumentFormDialog.descriptionLabel")}
            </Label>
            <Textarea
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("documentsDocumentFormDialog.descriptionPlaceholder")}
              rows={3}
              maxLength={10000}
            />
          </div>

          <div>
            <Label>{t("documentsDocumentFormDialog.fileLabel")} *</Label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              aria-label={t("documentsDocumentFormDialog.fileLabel")}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            {attachment ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">
                      {attachment.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  <Upload className="h-4 w-4" />
                  {t("documentsDocumentFormDialog.replaceFile")}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-24 w-full border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    {t("documentsDocumentFormDialog.chooseFile")}
                  </>
                )}
              </Button>
            )}
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
