import { HTTPError } from "ky";
import { CheckCircle2, Download, FileCheck2, FileText, Loader2, Search, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { FinalReportStatusBadge } from "@/components/supervisor/final-report-status-badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListSkeleton } from "@/components/ui/loading-skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { useAcademicYears } from "@/lib/api/academic";
import {
  useFinalReports,
  useReviewFinalReport,
  type FinalReport,
  type FinalReportFilters,
  type FinalReportStatus,
} from "@/lib/api/final-reports";
import type { UUID } from "@/lib/api/types";
import { downloadAttachment } from "@/lib/api/uploads";

const ALL_YEARS = "__all__";
/** Backend `FinalReportReviewRequest.note` — max 2000; rad etishda sabab majburiy. */
const NOTE_MAX = 2000;
const REASON_MIN = 3;

function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function download(report: FinalReport, fallback: string): Promise<void> {
  try {
    await downloadAttachment(report.file_attachment);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : fallback);
  }
}

/** Ko'rib chiqish: tasdiqlash (izoh ixtiyoriy) yoki sabab bilan qaytarish. */
function ReviewDialog({ report, onClose }: { report: FinalReport; onClose: () => void }) {
  const { t } = useTranslation();
  const noteId = useId();
  const [note, setNote] = useState("");
  const review = useReviewFinalReport();
  const reasonValid = note.trim().length >= REASON_MIN;

  const handle = async (approve: boolean) => {
    if (!approve && !reasonValid) {
      toast.error(t("adminReports.rejectReasonRequired"));
      return;
    }
    try {
      await review.mutateAsync({
        id: report.id,
        data: { approve, note: note.trim() || null },
      });
      toast.success(approve ? t("adminReports.approvedToast") : t("adminReports.rejectedToast"));
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !review.isPending && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-6">{t("adminReports.reviewDialog.title")}</DialogTitle>
          <DialogDescription>
            {[report.student_full_name, report.group_name, report.practice_type_name]
              .filter(Boolean)
              .join(" · ")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/30 p-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{report.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {report.file_attachment.name}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => void download(report, t("common.downloadError"))}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.download")}</span>
              <span className="sr-only sm:hidden">{t("common.download")}</span>
            </Button>
          </div>

          <div>
            <Label htmlFor={noteId}>{t("adminReports.reviewDialog.noteLabel")}</Label>
            <Textarea
              id={noteId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={NOTE_MAX}
              disabled={review.isPending}
              placeholder={t("adminReports.reviewDialog.notePlaceholder")}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={review.isPending}>
            {t("common.close")}
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => handle(false)}
            disabled={review.isPending || !reasonValid}
          >
            <XCircle className="h-4 w-4" />
            {t("supervisorReports.returnForRevision")}
          </Button>
          <Button onClick={() => handle(true)} disabled={review.isPending}>
            {review.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t("common.approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportsList({
  status,
  filters,
}: {
  status?: FinalReportStatus;
  filters: FinalReportFilters;
}) {
  const { t } = useTranslation();
  const { data, isPending, error } = useFinalReports(status, filters);
  const [reviewing, setReviewing] = useState<FinalReport | null>(null);

  if (isPending) return <ListSkeleton count={3} />;
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
        title={t("adminReports.emptyTitle")}
        description={
          status === "submitted" ? t("adminReports.emptySubmitted") : t("adminReports.emptyStatus")
        }
        accent="muted"
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {data.map((r) => (
          <Card key={r.id} className="min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-start gap-3 text-base">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="break-words leading-snug">{r.student_full_name ?? "—"}</div>
                  <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                    {[r.group_name, r.practice_type_name].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <FinalReportStatusBadge status={r.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 break-words text-sm font-medium">{r.title}</div>
                {r.final_grade != null && (
                  <Badge variant={r.credit_earned ? "success" : "secondary"} className="shrink-0">
                    {t("adminReports.ballValue", { value: r.final_grade })}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{r.file_attachment.name}</span>
                <span className="shrink-0">{fmtSize(r.file_attachment.size)}</span>
              </div>
              {r.reviewer_note && (
                <div className="break-words rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                  <span className="font-medium">{t("common.note")}:</span> {r.reviewer_note}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void download(r, t("common.downloadError"))}
                  className="flex-1"
                >
                  <Download className="h-4 w-4" />
                  {t("common.download")}
                </Button>
                {(r.status === "submitted" || r.status === "rejected") && (
                  <Button size="sm" onClick={() => setReviewing(r)}>
                    {t("adminReports.review")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {reviewing && (
        <ReviewDialog key={reviewing.id} report={reviewing} onClose={() => setReviewing(null)} />
      )}
    </>
  );
}

/** Supervizor: o'z talabalarining yakuniy hisobotlarini ko'rib chiqish (tasdiqlash / qaytarish). */
export function SupervisorReportsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<string>("submitted");
  const [academicYearId, setAcademicYearId] = useState<string>(ALL_YEARS);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 300);
  const { data: academicYears } = useAcademicYears();

  const filters: FinalReportFilters = {
    academic_year_id: academicYearId === ALL_YEARS ? undefined : (academicYearId as UUID),
    search: search || undefined,
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileCheck2 className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{t("adminReports.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("supervisorReports.subtitle")}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
          <Search
            className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t("adminReports.searchPlaceholder")}
            aria-label={t("adminReports.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxLength={100}
            className="pl-8"
          />
        </div>
        <Select value={academicYearId} onValueChange={setAcademicYearId}>
          <SelectTrigger className="w-[180px] max-w-full" aria-label={t("common.academicYear")}>
            <SelectValue placeholder={t("common.academicYear")} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value={ALL_YEARS}>{t("common.allYears")}</SelectItem>
            {(academicYears ?? []).map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.name}
                {y.is_active ? t("common.activeSuffix") : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="submitted">{t("adminReports.status.submitted")}</TabsTrigger>
          <TabsTrigger value="approved">{t("adminReports.status.approved")}</TabsTrigger>
          <TabsTrigger value="rejected">{t("adminReports.status.rejected")}</TabsTrigger>
          <TabsTrigger value="all">{t("adminReports.tabs.all")}</TabsTrigger>
        </TabsList>
        <TabsContent value="submitted">
          <ReportsList status="submitted" filters={filters} />
        </TabsContent>
        <TabsContent value="approved">
          <ReportsList status="approved" filters={filters} />
        </TabsContent>
        <TabsContent value="rejected">
          <ReportsList status="rejected" filters={filters} />
        </TabsContent>
        <TabsContent value="all">
          <ReportsList filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
