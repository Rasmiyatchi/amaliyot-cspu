import { AlertTriangle, Award, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFinalizeGrade, useGradeBreakdown } from "@/lib/api/grading";
import type { UUID } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Props = {
  assignmentId: UUID;
  open: boolean;
  onClose: () => void;
  /** Baholanmagan mezonlar bo'lsa — "Baholashga o'tish" tugmasi ko'rsatiladi */
  onGoToGrading?: () => void;
};

/**
 * Amaliyotni yakunlash — `POST /grading/.../finalize` orqali: yakuniy ball va kredit
 * yoziladi, holat "completed" bo'ladi. Tasdiqlashdan oldin hisoblangan bahoni ko'rsatadi;
 * barcha mezonlar baholanmaguncha yakunlab bo'lmaydi.
 */
export function FinalizeGradeDialog({ assignmentId, open, onClose, onGoToGrading }: Props) {
  const { t } = useTranslation();
  const { data, isPending, error } = useGradeBreakdown(open ? assignmentId : null);
  const finalize = useFinalizeGrade(assignmentId);

  const missingNames = (data?.criteria ?? [])
    .filter((c) => data?.missing_criteria.includes(c.key))
    .map((c) => c.name);
  const canFinalize = !!data && data.complete && !finalize.isPending;
  const creditWillBeEarned = !!data && data.min_total > 0 && data.total >= data.min_total;

  const handleConfirm = async () => {
    try {
      const res = await finalize.mutateAsync();
      toast.success(
        t("assignmentsGradePanel.finalizedToast", {
          grade: res.final_grade,
          max: res.max_total,
          credit: res.credit_earned
            ? t("assignmentsGradePanel.creditEarned")
            : t("assignmentsGradePanel.creditNotEarned"),
        }),
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("assignmentsGradePanel.finalizeError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !finalize.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {t("assignmentsGradePanel.finalizeTitle")}
          </DialogTitle>
          <DialogDescription>{t("assignmentsGradePanel.finalizeDescription")}</DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {data && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("assignmentsGradePanel.computedGrade")}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {data.total}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {data.max_total}
                  </span>
                </span>
              </div>
              {data.min_total > 0 && (
                <div className="mt-1 flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {t("assignmentsGradePanel.creditThreshold", { min: data.min_total })}
                  </span>
                  {data.complete && (
                    <span
                      className={cn(
                        "font-medium",
                        creditWillBeEarned ? "text-success" : "text-destructive",
                      )}
                    >
                      {creditWillBeEarned
                        ? t("assignmentsGradePanel.creditWillBeEarned")
                        : t("assignmentsGradePanel.creditWillNotBeEarned")}
                    </span>
                  )}
                </div>
              )}
            </div>

            {data.max_total === 0 && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t("assignmentsGradePanel.noCriteria")}</AlertDescription>
              </Alert>
            )}

            {!data.complete ? (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("assignmentsGradePanel.missingTitle")}</AlertTitle>
                <AlertDescription>
                  {t("assignmentsGradePanel.missingList", { names: missingNames.join(", ") })}
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("assignmentsGradePanel.finalizeIrreversible")}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={onClose} disabled={finalize.isPending}>
            {t("common.cancel")}
          </Button>
          {data && !data.complete && onGoToGrading ? (
            <Button variant="outline" onClick={onGoToGrading}>
              {t("assignmentsGradePanel.goToGrading")}
            </Button>
          ) : null}
          <Button onClick={handleConfirm} disabled={!canFinalize}>
            {finalize.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("assignmentsGradePanel.finalizeButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
