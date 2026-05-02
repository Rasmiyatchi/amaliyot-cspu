import { HTTPError } from "ky";
import { Download, FileIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  downloadAttachment,
  useDeleteAttachment,
  useUploadAttachment,
  type Attachment,
  type AttachmentKind,
} from "@/lib/api/uploads";
import { cn } from "@/lib/utils";
import type { UUID } from "@/lib/api/types";

type Props = {
  kind: AttachmentKind;
  entityId: UUID;
  attachments: Attachment[];
  /** Talabalar uchun true (boshqa rollar faqat ko'radi/yuklab oladi). */
  canEdit?: boolean;
  className?: string;
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentsSection({
  kind,
  entityId,
  attachments,
  canEdit = true,
  className,
}: Props) {
  const upload = useUploadAttachment(kind, entityId);
  const remove = useDeleteAttachment(kind, entityId);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Attachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync(file);
        toast.success(`${file.name} yuklandi`);
      } catch (e) {
        const msg = e instanceof HTTPError ? e.message : e instanceof Error ? e.message : "Xatolik";
        toast.error(`${file.name}: ${msg}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove.mutateAsync(confirmDelete.id);
      toast.success("O'chirildi");
      setConfirmDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const handleDownload = async (att: Attachment) => {
    try {
      await downloadAttachment(att);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Biriktirilgan fayllar ({attachments.length})
        </div>
      </div>

      {attachments.length === 0 && !canEdit && (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          Fayl biriktirilmagan
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
            >
              <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtSize(a.size)} · {new Date(a.uploaded_at).toLocaleString("uz-UZ")}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDownload(a)}
                title="Yuklab olish"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmDelete(a)}
                  title="O'chirish"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-4 text-center text-sm transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
          )}
        >
          {upload.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="text-muted-foreground">
            {upload.isPending
              ? "Yuklanmoqda..."
              : "Faylni shu yerga olib keling yoki bosing"}
          </div>
          <div className="text-xs text-muted-foreground">
            PDF, JPG, PNG, DOC, DOCX (max 10 MB)
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Faylni o'chirish"
        description={confirmDelete ? `"${confirmDelete.name}" o'chirilsinmi?` : ""}
        variant="destructive"
        confirmText="O'chirish"
        isPending={remove.isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
