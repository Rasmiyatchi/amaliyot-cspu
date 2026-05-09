import { HTTPError } from "ky";
import { FileText, Loader2, Save, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
      toast.success("PDF yuklandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklashda xato");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (attachments.length === 0) {
      toast.error("Kundalik PDF faylini yuklang");
      return;
    }
    try {
      if (isEdit && entry) {
        await update.mutateAsync({
          id: entry.id,
          data: { attachments },
        });
        toast.success("Yangilandi");
      } else {
        await create.mutateAsync({
          assignmentId,
          data: {
            date: new Date(date + "T12:00:00Z").toISOString(),
            attachments,
          },
        });
        toast.success("Yuborildi");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const busy = create.isPending || update.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Kundalikni tahrirlash" : "Yangi kundalik"}</DialogTitle>
          <DialogDescription>
            Sana belgilang va kundalik faylini PDF ko'rinishida yuklang.
          </DialogDescription>
        </DialogHeader>

        {entry?.status === "rejected" && entry.rejection_reason && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="font-medium">Rad etilgan</div>
              <div className="mt-1 text-sm">{entry.rejection_reason}</div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="journal-date">
              Sana <span className="text-destructive">*</span>
            </Label>
            <Input
              id="journal-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isEdit || isApproved}
              max={defaultDate()}
            />
          </div>

          <div>
            <Label>
              Kundalik fayli <span className="text-destructive">*</span>
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
                        Olib tashlash
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
                    Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    PDF tanlash
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Yopish
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
              {isEdit ? "Saqlash" : "Yuborish"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
