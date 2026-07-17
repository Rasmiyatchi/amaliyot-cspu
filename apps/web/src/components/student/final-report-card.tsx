import { HTTPError } from "ky";
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadStandaloneFile } from "@/lib/api/documents";
import {
  useFinalReportForAssignment,
  useSubmitFinalReport,
  type FinalReportStatus,
} from "@/lib/api/final-reports";
import { downloadAttachment } from "@/lib/api/uploads";
import type { Attachment } from "@/lib/api/uploads";
import type { UUID } from "@/lib/api/types";

const STATUS_LABEL: Record<FinalReportStatus, string> = {
  draft: "studentFinalReportCard.status.draft",
  submitted: "studentFinalReportCard.status.submitted",
  approved: "studentFinalReportCard.status.approved",
  rejected: "studentFinalReportCard.status.rejected",
};

function StatusBadge({ status }: { status: FinalReportStatus }) {
  const { t } = useTranslation();
  if (status === "approved")
    return (
      <Badge className="bg-success text-success-foreground">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        {t(STATUS_LABEL[status])}
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        {t(STATUS_LABEL[status])}
      </Badge>
    );
  return (
    <Badge variant="secondary">
      <Clock className="mr-1 h-3 w-3" />
      {t(STATUS_LABEL[status])}
    </Badge>
  );
}

export function FinalReportCard({ assignmentId }: { assignmentId: UUID }) {
  const { t } = useTranslation();
  const { data: report, isPending } = useFinalReportForAssignment(assignmentId);
  const submit = useSubmitFinalReport();
  const [title, setTitle] = useState(() => t("studentFinalReportCard.title"));
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const att = await uploadStandaloneFile(file);
      setAttachment(att);
      toast.success(t("studentFinalReportCard.toasts.fileUploaded"));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("studentFinalReportCard.errors.uploadError"),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!attachment) {
      toast.error(t("studentFinalReportCard.errors.fileRequired"));
      return;
    }
    if (!title.trim()) {
      toast.error(t("studentFinalReportCard.errors.titleRequired"));
      return;
    }
    try {
      await submit.mutateAsync({
        assignmentId,
        data: { title: title.trim(), file_attachment: attachment },
      });
      toast.success(t("studentFinalReportCard.toasts.submitted"));
      setAttachment(null);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const isApproved = report?.status === "approved";
  const canResubmit = !report || report.status === "rejected";
  const busy = submit.isPending || uploading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          {t("studentFinalReportCard.title")}
          {report && <StatusBadge status={report.status} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPending && (
          <div className="flex h-12 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isPending && report && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{report.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {report.file_attachment.name}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadAttachment(report.file_attachment)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {report.status === "rejected" && report.reviewer_note && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-medium">
                    {t("studentFinalReportCard.rejectReason")}
                  </div>
                  <div className="mt-1 text-sm">{report.reviewer_note}</div>
                </AlertDescription>
              </Alert>
            )}

            {isApproved && (
              <Alert>
                <AlertDescription className="text-sm">
                  {t("studentFinalReportCard.approvedInfo")}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {!isPending && canResubmit && (
          <div className="space-y-3 border-t border-border pt-3">
            <div>
              <Label>{t("studentFinalReportCard.reportTitleLabel")}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={500}
              />
            </div>
            <div>
              <Label>{t("studentFinalReportCard.fileLabel")} *</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.ppt,.pptx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              {attachment ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{attachment.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAttachment(null)}
                  >
                    {t("studentFinalReportCard.removeFile")}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="h-20 w-full border-dashed"
                  onClick={() => fileRef.current?.click()}
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
                      {t("studentFinalReportCard.chooseFile")}
                    </>
                  )}
                </Button>
              )}
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={busy || !attachment}
            >
              {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {report
                ? t("studentFinalReportCard.resubmit")
                : t("studentFinalReportCard.submit")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
