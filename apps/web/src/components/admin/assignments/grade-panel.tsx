import {
  Award,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Lock,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { FinalizeGradeDialog } from "@/components/admin/assignments/finalize-grade-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import {
  useFinalReportForAssignment,
  useReviewFinalReport,
  type FinalReport,
  type FinalReportStatus,
} from "@/lib/api/final-reports";
import {
  useGradeBreakdown,
  useSetCriterionScore,
  type CriterionScore,
} from "@/lib/api/grading";
import type { UUID } from "@/lib/api/types";
import { downloadAttachment } from "@/lib/api/uploads";
import { cn } from "@/lib/utils";

type Props = {
  assignmentId: UUID;
  /** Yakunlangan amaliyotni qayta baholashni bloklaydi */
  readOnly?: boolean;
};

export function GradePanel({ assignmentId, readOnly = false }: Props) {
  const { t } = useTranslation();
  const { data, isPending, error } = useGradeBreakdown(assignmentId);
  const { data: finalReport } = useFinalReportForAssignment(assignmentId);
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex h-24 items-center justify-center">
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
  if (!data) return null;

  const finalized = data.status === "completed" && data.final_grade !== null;
  const locked = readOnly || finalized;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {data.criteria.map((c) => (
          <CriterionRow
            key={c.key}
            assignmentId={assignmentId}
            criterion={c}
            locked={locked}
          />
        ))}
      </div>

      {finalReport && <FinalReportBlock report={finalReport} canReview={!readOnly} />}

      {/* Jami */}
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <Award className="h-4 w-4 text-primary" />
            {t("common.total")}
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {data.total}
            <span className="text-sm font-normal text-muted-foreground">
              /{data.max_total}
            </span>
          </span>
        </div>
        <Progress
          value={data.max_total ? (data.total / data.max_total) * 100 : 0}
          className="mt-2 h-2"
        />
        {data.min_total > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("assignmentsGradePanel.minPointsInfo", { min: data.min_total })}{" "}
            {!data.complete && !finalized ? (
              // Baholash tugamaguncha jami qisman — "yetmaydi" deyish erta
              <span className="font-medium">{t("assignmentsGradePanel.incomplete")}</span>
            ) : data.passed ? (
              <span className="font-medium text-success">{t("assignmentsGradePanel.enough")}</span>
            ) : (
              <span className="font-medium text-destructive">
                {t("assignmentsGradePanel.notEnough")}
              </span>
            )}
          </p>
        )}
      </div>

      {finalized ? (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>
            {t("assignmentsGradePanel.finalizedInfo", {
              grade: data.final_grade,
              max: data.max_total,
              credit: data.credit_earned
                ? t("assignmentsGradePanel.creditEarned")
                : t("assignmentsGradePanel.creditNotEarned"),
            })}
          </AlertDescription>
        </Alert>
      ) : (
        !readOnly && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {!data.complete && (
              <p className="text-xs text-muted-foreground">
                {t("assignmentsGradePanel.gradeAllHint")}
              </p>
            )}
            <Button
              className="ml-auto"
              disabled={!data.complete}
              onClick={() => setFinalizeOpen(true)}
            >
              {t("assignmentsGradePanel.finalizeButton")}
            </Button>
          </div>
        )
      )}

      <FinalizeGradeDialog
        assignmentId={assignmentId}
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
      />
    </div>
  );
}

const REPORT_STATUS_VARIANT: Record<FinalReportStatus, "secondary" | "success" | "destructive"> = {
  draft: "secondary",
  submitted: "secondary",
  approved: "success",
  rejected: "destructive",
};

/** Yakuniy hisobot — biriktirilgan amaliyot rahbari (yoki admin) shu yerda ko'rib chiqadi. */
function FinalReportBlock({ report, canReview }: { report: FinalReport; canReview: boolean }) {
  const { t } = useTranslation();
  const review = useReviewFinalReport();
  const [rejectOpen, setRejectOpen] = useState(false);

  // Backend faqat "submitted" yoki "rejected" holatdagi hisobotni ko'rib chiqishga ruxsat beradi
  const reviewable = canReview && (report.status === "submitted" || report.status === "rejected");

  const handleReview = async (approve: boolean, note: string | null) => {
    try {
      await review.mutateAsync({ id: report.id, data: { approve, note } });
      toast.success(
        approve
          ? t("assignmentsGradePanel.reportApprovedToast")
          : t("assignmentsGradePanel.reportRejectedToast"),
      );
      setRejectOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const handleDownload = async () => {
    try {
      await downloadAttachment(report.file_attachment);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.downloadError"));
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <span className="font-medium">{t("assignmentsGradePanel.finalReportTitle")}</span>
        <Badge variant={REPORT_STATUS_VARIANT[report.status]}>
          {t(`adminReports.status.${report.status}`)}
        </Badge>
      </div>
      <div className="break-words text-sm">{report.title}</div>
      {report.reviewer_note && (
        <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
          <span className="font-medium">{t("common.note")}:</span> {report.reviewer_note}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4" />
          {t("common.download")}
        </Button>
        {reviewable && (
          <>
            {report.status === "submitted" && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setRejectOpen(true)}
                disabled={review.isPending}
              >
                <XCircle className="h-4 w-4" />
                {t("common.reject")}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => handleReview(true, null)}
              disabled={review.isPending}
            >
              {review.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t("common.approve")}
            </Button>
          </>
        )}
      </div>

      <PromptDialog
        open={rejectOpen}
        title={t("assignmentsGradePanel.reportRejectTitle")}
        description={t("assignmentsGradePanel.reportRejectDescription")}
        label={t("assignmentsAssignmentDetailDialog.rejectReasonLabel")}
        confirmText={t("common.reject")}
        variant="destructive"
        isPending={review.isPending}
        onConfirm={(reason) => handleReview(false, reason)}
        onClose={() => setRejectOpen(false)}
      />
    </div>
  );
}

function CriterionRow({
  assignmentId,
  criterion,
  locked,
}: {
  assignmentId: UUID;
  criterion: CriterionScore;
  locked: boolean;
}) {
  const { t } = useTranslation();
  const setScore = useSetCriterionScore(assignmentId);
  const [draft, setDraft] = useState(
    criterion.score !== null ? String(criterion.score) : "",
  );

  // Boshqa mezon saqlanganda server qayta hisoblab yuboradi — inputni moslaymiz
  useEffect(() => {
    setDraft(criterion.score !== null ? String(criterion.score) : "");
  }, [criterion.score]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed === "") return;
    const value = Number(trimmed);
    if (!Number.isInteger(value) || value < 0 || value > criterion.max) {
      toast.error(t("assignmentsGradePanel.scoreRangeError", { max: criterion.max }));
      setDraft(criterion.score !== null ? String(criterion.score) : "");
      return;
    }
    if (value === criterion.score) return;
    try {
      await setScore.mutateAsync({ key: criterion.key, score: value });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("assignmentsGradePanel.saveError"));
      setDraft(criterion.score !== null ? String(criterion.score) : "");
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{criterion.name}</span>
          {criterion.auto ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              {t("assignmentsGradePanel.autoBadge")}
            </Badge>
          ) : (
            <Badge variant="outline">{t("assignmentsGradePanel.manualBadge")}</Badge>
          )}
        </div>
        {criterion.detail && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {criterion.detail}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {criterion.auto || locked ? (
          <span
            className={cn(
              "tabular-nums font-semibold",
              criterion.score === null && "text-muted-foreground",
            )}
          >
            {criterion.score ?? "—"}
          </span>
        ) : (
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={criterion.max}
            step={1}
            value={draft}
            disabled={setScore.isPending}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            aria-label={t("assignmentsGradePanel.scoreFor", {
              name: criterion.name,
              max: criterion.max,
            })}
            className="h-9 w-20 text-right tabular-nums"
            placeholder="—"
          />
        )}
        <span className="text-sm text-muted-foreground">/ {criterion.max}</span>
        {setScore.isPending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
