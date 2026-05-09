import { HTTPError } from "ky";
import { FileText, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import type { Attachment } from "@/lib/api/uploads";
import type { UUID } from "@/lib/api/types";

type Props = {
  open: boolean;
  document?: DocumentEntity | null;
  defaultKind?: DocumentKind;
  onClose: () => void;
};

const KIND_LABEL: Record<DocumentKind, string> = {
  regulation: "Normativ hujjat",
  program: "Amaliyot dasturi",
};

export function DocumentFormDialog({ open, document, defaultKind, onClose }: Props) {
  const isEdit = !!document;
  const [kind, setKind] = useState<DocumentKind>("regulation");
  const [practiceTypeId, setPracticeTypeId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const create = useCreateDocument();
  const update = useUpdateDocument();
  const practiceTypes = usePracticeTypes();

  useEffect(() => {
    if (!open) return;
    if (document) {
      setKind(document.kind);
      setPracticeTypeId(document.practice_type_id ?? "");
      setTitle(document.title);
      setDescription(document.description ?? "");
      setAttachment(document.file_attachment);
    } else {
      setKind(defaultKind ?? "regulation");
      setPracticeTypeId("");
      setTitle("");
      setDescription("");
      setAttachment(null);
    }
  }, [open, document, defaultKind]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const att = await uploadStandaloneFile(file);
      setAttachment(att);
      toast.success("Fayl yuklandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklash xatosi");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Sarlavha majburiy");
      return;
    }
    if (kind === "program" && !practiceTypeId) {
      toast.error("Amaliyot dasturi uchun amaliyot turi tanlash shart");
      return;
    }
    if (!attachment) {
      toast.error("Fayl yuklang");
      return;
    }

    try {
      if (isEdit && document) {
        await update.mutateAsync({
          id: document.id,
          data: {
            practice_type_id: practiceTypeId ? (practiceTypeId as UUID) : null,
            title: title.trim(),
            description: description.trim() || null,
            file_attachment: attachment,
          },
        });
        toast.success("Hujjat yangilandi");
      } else {
        await create.mutateAsync({
          kind,
          practice_type_id: practiceTypeId ? (practiceTypeId as UUID) : null,
          title: title.trim(),
          description: description.trim() || null,
          file_attachment: attachment,
        });
        toast.success("Hujjat qo'shildi");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const busy = create.isPending || update.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Hujjatni tahrirlash" : "Yangi hujjat"}
          </DialogTitle>
          <DialogDescription>
            Normativ hujjatlar — umumiy. Amaliyot dasturlari — har turga alohida.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Hujjat turi *</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as DocumentKind)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regulation">{KIND_LABEL.regulation}</SelectItem>
                <SelectItem value="program">{KIND_LABEL.program}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kind === "program" && (
            <div>
              <Label>Amaliyot turi *</Label>
              <Select value={practiceTypeId} onValueChange={setPracticeTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
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
          )}

          <div>
            <Label>Sarlavha *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hujjat nomi"
              maxLength={500}
            />
          </div>

          <div>
            <Label>Tavsif</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qo'shimcha izoh (ixtiyoriy)"
              rows={3}
              maxLength={10000}
            />
          </div>

          <div>
            <Label>Fayl *</Label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
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
                  Almashtirish
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
                    Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Fayl tanlash (PDF, DOC, XLS, PPT)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Bekor
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Saqlash" : "Qo'shish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
