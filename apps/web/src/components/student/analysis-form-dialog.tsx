import { HTTPError } from "ky";
import { FileText, Loader2, Save, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { uploadStandaloneFile } from "@/lib/api/documents";
import {
  useCreateLessonAnalysis,
  useUpdateLessonAnalysis,
} from "@/lib/api/tasks";
import type { Attachment } from "@/lib/api/uploads";
import type { LessonAnalysis, UUID } from "@/lib/api/types";

type Props = {
  open: boolean;
  assignmentId: UUID;
  analysis: LessonAnalysis | null;
  onClose: () => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LessonAnalysisFormDialog({
  open,
  assignmentId,
  analysis,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [date, setDate] = useState(today());
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [quarter, setQuarter] = useState("1");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const create = useCreateLessonAnalysis();
  const update = useUpdateLessonAnalysis();

  const isEdit = !!analysis;
  const isApproved = analysis?.status === "approved";

  useEffect(() => {
    if (!open) return;
    if (analysis) {
      setDate(analysis.date.slice(0, 10));
      setSubject(analysis.subject);
      setTeacher(analysis.teacher_name);
      setGradeLevel(analysis.grade_level ?? "");
      setQuarter(String(analysis.quarter));
      setAttachments((analysis.attachments ?? []) as Attachment[]);
    } else {
      setDate(today());
      setSubject("");
      setTeacher("");
      setGradeLevel("");
      setQuarter("1");
      setAttachments([]);
    }
  }, [open, analysis]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const att = await uploadStandaloneFile(file);
      setAttachments((prev) => [...prev, att]);
      toast.success(t("studentAnalysisFormDialog.pdfUploaded"));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("studentAnalysisFormDialog.uploadError"),
      );
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (subject.trim().length < 1 || teacher.trim().length < 1) {
      toast.error(t("studentAnalysisFormDialog.requiredFields"));
      return;
    }
    if (attachments.length === 0) {
      toast.error(t("studentAnalysisFormDialog.pdfRequired"));
      return;
    }

    const base = {
      date: new Date(date + "T12:00:00Z").toISOString(),
      subject: subject.trim(),
      teacher_name: teacher.trim(),
      grade_level: gradeLevel.trim() || null,
      quarter: Number(quarter),
      attachments,
    };

    try {
      if (isEdit && analysis) {
        await update.mutateAsync({ id: analysis.id, data: base });
        toast.success(t("common.updated"));
      } else {
        await create.mutateAsync({ assignmentId, data: base });
        toast.success(t("studentAnalysisFormDialog.submittedToast"));
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const busy = create.isPending || update.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("studentAnalysisFormDialog.editTitle")
              : t("studentAnalysisFormDialog.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("studentAnalysisFormDialog.subtitle")}
          </DialogDescription>
        </DialogHeader>

        {analysis?.status === "rejected" && analysis.rejection_reason && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="font-medium">{t("studentAnalysisFormDialog.rejected")}</div>
              <div className="mt-1 text-sm">{analysis.rejection_reason}</div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="analysis-date">
              {t("common.date")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="analysis-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isApproved}
            />
          </div>
          <div>
            <Label htmlFor="analysis-quarter">
              {t("studentAnalysisFormDialog.quarter")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Select value={quarter} onValueChange={setQuarter} disabled={isApproved}>
              <SelectTrigger id="analysis-quarter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  {t("studentAnalysisFormDialog.quarterN", { n: 1 })}
                </SelectItem>
                <SelectItem value="2">
                  {t("studentAnalysisFormDialog.quarterN", { n: 2 })}
                </SelectItem>
                <SelectItem value="3">
                  {t("studentAnalysisFormDialog.quarterN", { n: 3 })}
                </SelectItem>
                <SelectItem value="4">
                  {t("studentAnalysisFormDialog.quarterN", { n: 4 })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="analysis-grade">
              {t("studentAnalysisFormDialog.gradeLevel")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="analysis-grade"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              disabled={isApproved}
              placeholder={t("studentAnalysisFormDialog.gradePlaceholder")}
            />
          </div>
          <div>
            <Label htmlFor="analysis-subject">
              {t("studentAnalysisFormDialog.subject")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="analysis-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isApproved}
              placeholder={t("studentAnalysisFormDialog.subjectPlaceholder")}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="analysis-teacher">
              {t("studentAnalysisFormDialog.teacher")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="analysis-teacher"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              disabled={isApproved}
              placeholder={t("studentAnalysisFormDialog.teacherPlaceholder")}
            />
          </div>
        </div>

        <div>
          <Label>
            {t("studentAnalysisFormDialog.fileLabel")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          {attachments.length > 0 && (
            <div className="mb-2 space-y-1.5">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{att.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(att.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  {!isApproved && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeAttachment(att.id)}
                    >
                      {t("studentAnalysisFormDialog.remove")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isApproved && (
            <Button
              type="button"
              variant="outline"
              className="h-20 w-full border-dashed"
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
                  {t("studentAnalysisFormDialog.choosePdf")}
                </>
              )}
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
          {!isApproved && (
            <Button
              onClick={handleSave}
              disabled={busy || attachments.length === 0}
            >
              {(create.isPending || update.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <Save className="h-4 w-4" />
              {isEdit ? t("common.save") : t("studentAnalysisFormDialog.submit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
