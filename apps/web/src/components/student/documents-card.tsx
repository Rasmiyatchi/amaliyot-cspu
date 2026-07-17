import { Download, FileIcon, FolderArchive, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  downloadAttachment,
  useAssignmentAttachments,
} from "@/lib/api/uploads";
import { dateLocale } from "@/i18n";
import type { UUID } from "@/lib/api/types";

const SOURCE_LABEL = {
  task: "studentDocumentsCard.source.task",
  journal: "studentDocumentsCard.source.journal",
  analysis: "studentDocumentsCard.source.analysis",
};

const SOURCE_VARIANT: Record<string, "default" | "info" | "success"> = {
  task: "default",
  journal: "info",
  analysis: "success",
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type Props = { assignmentId: UUID };

export function StudentDocumentsCard({ assignmentId }: Props) {
  const { t } = useTranslation();
  const { data, isPending } = useAssignmentAttachments(assignmentId);

  const handleDownload = async (att: { name: string; path: string }) => {
    try {
      await downloadAttachment(att as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderArchive className="h-4 w-4" />
          {t("studentDocumentsCard.title")} {data ? `(${data.length})` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="flex h-16 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {data && data.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {t("studentDocumentsCard.empty")}
          </div>
        )}
        {data && data.length > 0 && (
          <div className="space-y-1.5">
            {data.map((a) => (
              <div
                key={`${a.source}-${a.id}`}
                className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
              >
                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{a.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant={SOURCE_VARIANT[a.source]} className="text-[10px]">
                      {t(SOURCE_LABEL[a.source as keyof typeof SOURCE_LABEL])}
                    </Badge>
                    <span>{fmtSize(a.size)}</span>
                    <span>· {new Date(a.uploaded_at).toLocaleString(dateLocale())}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDownload(a)}
                  title={t("common.download")}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
