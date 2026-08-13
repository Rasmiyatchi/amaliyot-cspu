import { Download, Eye, FileIcon, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadAttachment, type Attachment } from "@/lib/api/uploads";
import { useAuthStore } from "@/stores/auth";

/** Preview uchun minimal fayl ma'lumoti — to'liq Attachment ham mos keladi */
export type PreviewFile = Pick<Attachment, "name" | "path" | "mime" | "size">;

type Props = {
  attachment: PreviewFile | null;
  onClose: () => void;
};

export function FilePreviewModal({ attachment, onClose }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attachment) {
      setBlobUrl(null);
      setTextContent(null);
      setError(null);
      return;
    }

    let active = true;
    let urlToRevoke: string | null = null;

    async function loadFile() {
      setLoading(true);
      setError(null);
      try {
        const token = useAuthStore.getState().accessToken;
        const res = await fetch(`/api/v1/uploads/file/${attachment!.path}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Faylni yuklab bo'lmadi");
        }

        const blob = await res.blob();
        if (!active) return;

        // Ensure PDF blob has correct type for iframe rendering
        let finalBlob = blob;
        const ext = attachment!.name.split(".").pop()?.toLowerCase() || "";
        const isPdf = attachment!.mime === "application/pdf" || ext === "pdf";
        if (isPdf && blob.type !== "application/pdf") {
          finalBlob = new Blob([blob], { type: "application/pdf" });
        }

        const url = URL.createObjectURL(finalBlob);
        urlToRevoke = url;
        setBlobUrl(url);

        // Agar matnli fayl bo'lsa, string sifatida ham o'qiymiz
        const isText =
          attachment!.mime.startsWith("text/") ||
          ["txt", "md", "json", "csv", "log", "xml", "py", "js"].includes(ext);

        if (isText) {
          const text = await blob.text();
          if (active) setTextContent(text);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Faylni ko'rishda xatolik yuz berdi");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFile();

    return () => {
      active = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [attachment]);

  if (!attachment) return null;

  const ext = attachment.name.split(".").pop()?.toLowerCase() || "";
  const isPdf = attachment.mime === "application/pdf" || ext === "pdf";
  const isImage =
    attachment.mime.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext);

  const handleDownload = async () => {
    try {
      await downloadAttachment(attachment);
    } catch (e) {
      toast.error("Yuklab olishda xatolik");
    }
  };

  return (
    <Dialog open={!!attachment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex flex-col max-w-4xl h-[88vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
              <FileIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold truncate">
                {attachment.name}
              </DialogTitle>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{(attachment.size / 1024 / 1024).toFixed(2)} MB</span>
                <span>•</span>
                <span className="uppercase">{ext}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span>Yuklab olish</span>
            </Button>

            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-muted/10 relative overflow-auto p-4 flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm font-medium">Fayl yuklanmoqda...</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center p-6 bg-background rounded-lg border border-destructive/30 max-w-md">
              <p className="text-destructive font-medium text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={handleDownload} className="mt-3">
                <Download className="h-4 w-4 mr-2" />
                Faylni yuklab olish
              </Button>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <>
              {/* PDF Viewer */}
              {isPdf && (
                <iframe
                  src={`${blobUrl}#toolbar=1&navpanes=0`}
                  title={attachment.name}
                  className="w-full h-full rounded-md border border-border shadow-sm bg-white"
                />
              )}

              {/* Image Viewer */}
              {isImage && (
                <div className="flex items-center justify-center w-full h-full">
                  <img
                    src={blobUrl}
                    alt={attachment.name}
                    className="max-h-full max-w-full object-contain rounded-md shadow-md bg-background"
                  />
                </div>
              )}

              {/* Text / Code Viewer */}
              {textContent !== null && !isPdf && !isImage && (
                <div className="w-full h-full bg-background rounded-md border border-border p-4 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {textContent}
                </div>
              )}

              {/* Fallback for Word/Excel/Zip or other formats */}
              {!isPdf && !isImage && textContent === null && (
                <div className="text-center p-8 bg-background rounded-lg border border-border max-w-sm shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <Eye className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Ushbu fayl turini to'g'ridan-to'g'ri ko'rib bo'lmaydi</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Microsoft Word, Excel va arxiv fayllarini kompyuteringizga yuklab olib ko'rishingiz mumkin.
                    </p>
                  </div>
                  <Button onClick={handleDownload} className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Faylni yuklab olish
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
