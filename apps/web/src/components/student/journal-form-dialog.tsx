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
import { uploadStandaloneFile } from "@/lib/api/documents";
import { useCreateJournal, useUpdateJournal } from "@/lib/api/tasks";
import type { Attachment } from "@/lib/api/uploads";
import type { JournalEntry, UUID } from "@/lib/api/types";

type Props = {
  open: boolean;
  assignmentId: UUID;
  entry: JournalEntry | null;
  onClose: () => void;
};

function defaultDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function JournalFormDialog({ open, assignmentId, entry, onClose }: Props) {
  const { t } = useTranslation();
  const [date, setDate] = useState<string>(defaultDate());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const create = useCreateJournal();
  const update = useUpdateJournal();

  const isEdit = !!entry;
  const isApproved = entry?.status === "approved";

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setDate(entry.date.slice(0, 10));
      setAttachments((entry.attachments ?? []) as Attachment[]);
    } else {
      setDate(defaultDate());
      setAttachments([]);
    }
  }, [open, entry]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const att = await uploadStandaloneFile(file);
      setAttachments((prev) => [...prev, att]);
      toast.success(t("studentJournalFormDialog.pdfUploaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("studentJournalFormDialog.uploadError"));
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (attachments.length === 0) {
      toast.error(t("studentJournalFormDialog.pdfRequired"));
      return;
    }
    try {
      if (isEdit && entry) {
        await update.mutateAsync({
          id: entry.id,
          data: { attachments },
        });
        toast.success(t("common.updated"));
      } else {
        await create.mutateAsync({
          assignmentId,
          data: {
            date: new Date(date + "T12:00:00Z").toISOString(),
            attachments,
          },
        });
        toast.success(t("studentJournalFormDialog.submitted"));
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const busy = create.isPending || update.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[88dvh] sm:max-w-xl overflow-y-auto">
        <DialogHeader className="pr-6 sm:pr-0 text-left">
          <DialogTitle className="text-base sm:text-lg font-semibold">{isEdit ? t("studentJournalFormDialog.editTitle") : t("studentJournalFormDialog.newTitle")}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t("studentJournalFormDialog.description")}
          </DialogDescription>
        </DialogHeader>

        {entry?.status === "rejected" && entry.rejection_reason && (
          <Alert variant="destructive" className="py-2.5 px-3">
            <AlertDescription>
              <div className="font-medium text-xs sm:text-sm">{t("studentJournalFormDialog.rejected")}</div>
              <div className="mt-1 text-xs sm:text-sm break-words">{entry.rejection_reason}</div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="journal-date" className="text-xs sm:text-sm">
              {t("common.date")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="journal-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isEdit || isApproved}
              max={defaultDate()}
              className="mt-1 text-xs sm:text-sm"
            />
          </div>

          <div>
            <Label className="text-xs sm:text-sm">
              {t("studentJournalFormDialog.fileLabel")} <span className="text-destructive">*</span>
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
              <div className="mt-1.5 mb-2 space-y-1.5 min-w-0">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2 min-w-0 text-xs sm:text-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{att.name}</div>
                      <div className="text-[11px] sm:text-xs text-muted-foreground truncate">
                        {(att.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    {!isApproved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 h-7 text-xs px-2"
                        onClick={() => removeAttachment(att.id)}
                      >
                        {t("studentJournalFormDialog.removeFile")}
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
                className="mt-1.5 h-16 sm:h-20 w-full border-dashed text-xs sm:text-sm gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                    {t("studentJournalFormDialog.choosePdf")}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            {t("common.close")}
          </Button>
          {!isApproved && (
            <Button
              onClick={handleSave}
              disabled={busy || attachments.length === 0}
              className="w-full sm:w-auto"
            >
              {(create.isPending || update.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <Save className="h-4 w-4" />
              {isEdit ? t("common.save") : t("studentJournalFormDialog.submit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
