import { Download, FileIcon, FolderArchive, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  downloadAttachment,
  useAssignmentAttachments,
} from "@/lib/api/uploads";
import type { UUID } from "@/lib/api/types";

const SOURCE_LABEL = {
  task: "Topshiriq",
  journal: "Kundalik",
  analysis: "Dars tahlili",
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
  const { data, isPending } = useAssignmentAttachments(assignmentId);

  const handleDownload = async (att: { name: string; path: string }) => {
    try {
      await downloadAttachment(att as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderArchive className="h-4 w-4" />
          Mening hujjatlarim {data ? `(${data.length})` : ""}
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
            Hali fayl yuklamagansiz. Topshiriq, kundalik yoki dars tahlilida fayl
            biriktiring.
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
                      {SOURCE_LABEL[a.source as keyof typeof SOURCE_LABEL]}
                    </Badge>
                    <span>{fmtSize(a.size)}</span>
                    <span>· {new Date(a.uploaded_at).toLocaleString("uz-UZ")}</span>
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
