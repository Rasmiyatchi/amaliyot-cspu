import { HTTPError } from "ky";
import {
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useFinalReports,
  useReviewFinalReport,
  type FinalReport,
  type FinalReportStatus,
} from "@/lib/api/final-reports";
import { downloadAttachment } from "@/lib/api/uploads";

const STATUS_LABEL: Record<FinalReportStatus, string> = {
  draft: "Qoralama",
  submitted: "Kutilmoqda",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
};

function StatusBadge({ status }: { status: FinalReportStatus }) {
  if (status === "approved")
    return (
      <Badge className="bg-success text-success-foreground">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        {STATUS_LABEL[status]}
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        {STATUS_LABEL[status]}
      </Badge>
    );
  return (
    <Badge variant="secondary">
      <Clock className="mr-1 h-3 w-3" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function ReviewDialog({
  report,
  onClose,
}: {
  report: FinalReport | null;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const review = useReviewFinalReport();

  const handle = async (approve: boolean) => {
    if (!report) return;
    if (!approve && note.trim().length < 3) {
      toast.error("Rad etish sababi kerak");
      return;
    }
    try {
      await review.mutateAsync({
        id: report.id,
        data: { approve, note: note.trim() || null },
      });
      toast.success(approve ? "Tasdiqlandi" : "Rad etildi");
      setNote("");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        {report && (
          <>
            <DialogHeader>
              <DialogTitle>Yakuniy hisobotni ko'rib chiqish</DialogTitle>
              <DialogDescription>
                {report.student_full_name} · {report.practice_type_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{report.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {report.file_attachment.name}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadAttachment(report.file_attachment)}
                >
                  <Download className="h-4 w-4" />
                  Yuklab olish
                </Button>
              </div>

              <div>
                <Label>Izoh (rad etishda majburiy)</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Tasdiqlash uchun ixtiyoriy, rad etishda sababini yozing"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => handle(false)}
                disabled={review.isPending}
              >
                <XCircle className="h-4 w-4" />
                Rad etish
              </Button>
              <Button onClick={() => handle(true)} disabled={review.isPending}>
                {review.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle2 className="h-4 w-4" />
                Tasdiqlash
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportsList({ status }: { status?: FinalReportStatus }) {
  const { data, isPending, error } = useFinalReports(status);
  const [reviewing, setReviewing] = useState<FinalReport | null>(null);

  if (isPending) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={FileCheck2}
        title="Hisobotlar yo'q"
        description={
          status === "submitted"
            ? "Tasdiqlash kutayotgan hisobot yo'q"
            : "Bu holatda hisobot yo'q"
        }
        accent="muted"
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {data.map((r) => (
          <Card key={r.id} className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-start gap-3 text-base">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="leading-snug">{r.student_full_name ?? "—"}</div>
                  <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                    {r.practice_type_name ?? "—"}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm font-medium">{r.title}</div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{r.file_attachment.name}</span>
                <span className="shrink-0">
                  {(r.file_attachment.size / 1024).toFixed(1)} KB
                </span>
              </div>
              {r.reviewer_note && (
                <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                  <span className="font-medium">Izoh:</span> {r.reviewer_note}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadAttachment(r.file_attachment)}
                  className="flex-1"
                >
                  <Download className="h-4 w-4" />
                  Yuklab olish
                </Button>
                {(r.status === "submitted" || r.status === "rejected") && (
                  <Button size="sm" onClick={() => setReviewing(r)}>
                    Ko'rib chiqish
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ReviewDialog report={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}

export function ReportsPage() {
  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileCheck2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Yakuniy hisobotlar</h1>
          <p className="text-sm text-muted-foreground">
            Talabalar topshirgan yakuniy hisobotlarni ko'rib chiqing
          </p>
        </div>
      </div>

      <Tabs defaultValue="submitted">
        <TabsList>
          <TabsTrigger value="submitted">Kutilmoqda</TabsTrigger>
          <TabsTrigger value="approved">Tasdiqlangan</TabsTrigger>
          <TabsTrigger value="rejected">Rad etilgan</TabsTrigger>
          <TabsTrigger value="all">Hammasi</TabsTrigger>
        </TabsList>
        <TabsContent value="submitted">
          <ReportsList status="submitted" />
        </TabsContent>
        <TabsContent value="approved">
          <ReportsList status="approved" />
        </TabsContent>
        <TabsContent value="rejected">
          <ReportsList status="rejected" />
        </TabsContent>
        <TabsContent value="all">
          <ReportsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
