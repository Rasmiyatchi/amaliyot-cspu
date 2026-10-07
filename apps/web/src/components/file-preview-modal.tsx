import { Download, Eye, FileIcon, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import i18n from "@/i18n";
import { authFetch, downloadFile, readErrorDetail } from "@/lib/api";
import { downloadAttachment, fetchAttachmentBlob } from "@/lib/api/uploads";

/** Preview uchun minimal fayl ma'lumoti — eski yozuvlarda mime/size bo'lmasligi mumkin. */
export type PreviewFile = {
  name: string;
  /** `/uploads/file/` ostidagi biriktirma yo'li (url berilmasa) */
  path: string;
  mime?: string;
  size?: number;
  /** Alohida endpoint orqali beriladigan fayl (masalan, shartnoma skani) — token bilan olinadi */
  url?: string;
};

async function fetchPreviewBlob(file: PreviewFile): Promise<Blob> {
  if (!file.url) return fetchAttachmentBlob(file);
  const res = await authFetch(file.url);
  if (!res.ok) throw new Error(await readErrorDetail(res, i18n.t("filePreviewModal.loadFailed")));
  return res.blob();
}

type Props = {
  attachment: PreviewFile | null;
  onClose: () => void;
};

const TEXT_EXTENSIONS = ["txt", "md", "json", "csv", "log", "xml", "py", "js"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "svg"];

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

export function FilePreviewModal({ attachment, onClose }: Props) {
  const { t } = useTranslation();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBlobUrl(null);
    setTextContent(null);
    setError(null);
    if (!attachment) return;

    let active = true;
    let urlToRevoke: string | null = null;

    async function loadFile(file: PreviewFile) {
      setLoading(true);
      try {
        const blob = await fetchPreviewBlob(file);
        if (!active) return;

        // iframe PDF'ni to'g'ri chizishi uchun turi aniq bo'lsin
        const ext = extensionOf(file.name);
        const isPdf = file.mime === "application/pdf" || ext === "pdf";
        const finalBlob =
          isPdf && blob.type !== "application/pdf"
            ? new Blob([blob], { type: "application/pdf" })
            : blob;

        const url = URL.createObjectURL(finalBlob);
        urlToRevoke = url;
        setBlobUrl(url);

        const isText = (file.mime ?? "").startsWith("text/") || TEXT_EXTENSIONS.includes(ext);
        if (isText) {
          const text = await blob.text();
          if (active) setTextContent(text);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : t("filePreviewModal.previewError"));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFile(attachment);

    return () => {
      active = false;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [attachment, t]);

  if (!attachment) return null;

  const ext = extensionOf(attachment.name);
  const isPdf = attachment.mime === "application/pdf" || ext === "pdf";
  const isImage = (attachment.mime ?? "").startsWith("image/") || IMAGE_EXTENSIONS.includes(ext);

  const handleDownload = async () => {
    try {
      if (attachment.url) {
        await downloadFile(attachment.url, attachment.name, i18n.t("common.downloadError"));
      } else {
        await downloadAttachment(attachment);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.downloadError"));
    }
  };

  return (
    <Dialog open={!!attachment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showClose={false}
        aria-describedby={undefined}
        className="flex flex-col w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-4xl h-[90dvh] max-h-[90dvh] p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="p-3 sm:p-4 border-b border-border flex flex-row items-center justify-between space-y-0 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-2">
            <div className="p-1.5 sm:p-2 rounded-md bg-primary/10 text-primary shrink-0">
              <FileIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xs sm:text-base font-semibold truncate text-left">
                {attachment.name}
              </DialogTitle>
              <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
                {attachment.size !== undefined && (
                  <>
                    <span>{(attachment.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span aria-hidden="true">•</span>
                  </>
                )}
                <span className="uppercase">{ext}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 text-xs gap-1 px-2 sm:px-3"
              aria-label={t("common.download")}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("common.download")}</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content Viewer Body */}
        <div className="flex-1 min-h-0 bg-muted/10 relative overflow-auto p-4 flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm font-medium">{t("filePreviewModal.loading")}</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center p-6 bg-background rounded-lg border border-destructive/30 max-w-md">
              <p className="text-destructive font-medium text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={handleDownload} className="mt-3">
                <Download className="h-4 w-4 mr-2" />
                {t("filePreviewModal.downloadFile")}
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
                    <h4 className="font-semibold text-sm">{t("filePreviewModal.unsupportedTitle")}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("filePreviewModal.unsupportedDescription")}
                    </p>
                  </div>
                  <Button onClick={handleDownload} className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    {t("filePreviewModal.downloadFile")}
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
