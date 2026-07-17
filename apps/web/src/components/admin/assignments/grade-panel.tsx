import { Award, Check, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  useFinalizeGrade,
  useGradeBreakdown,
  useSetCriterionScore,
  type CriterionScore,
} from "@/lib/api/grading";
import type { UUID } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Props = {
  assignmentId: UUID;
  /** Yakunlangan amaliyotni qayta baholashni bloklaydi */
  readOnly?: boolean;
};

export function GradePanel({ assignmentId, readOnly = false }: Props) {
  const { data, isPending, error } = useGradeBreakdown(assignmentId);
  const finalize = useFinalizeGrade(assignmentId);

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

  const handleFinalize = async () => {
    if (!confirm("Amaliyotni yakunlaysizmi? Umumiy ball chiqariladi.")) return;
    try {
      const res = await finalize.mutateAsync();
      toast.success(
        `Yakunlandi — ${res.final_grade}/${res.max_total} ball, kredit ${
          res.credit_earned ? "olindi" : "olinmadi"
        }`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yakunlab bo'lmadi");
    }
  };

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

      {/* Jami */}
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <Award className="h-4 w-4 text-primary" />
            Jami
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
            Kredit uchun kamida {data.min_total} ball kerak —{" "}
            {data.passed ? (
              <span className="font-medium text-success">yetarli</span>
            ) : (
              <span className="font-medium text-destructive">yetmaydi</span>
            )}
          </p>
        )}
      </div>

      {finalized ? (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>
            Amaliyot yakunlangan — yakuniy ball {data.final_grade}/{data.max_total}, kredit{" "}
            {data.credit_earned ? "olindi" : "olinmadi"}.
          </AlertDescription>
        </Alert>
      ) : (
        !readOnly && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {!data.complete && (
              <p className="text-xs text-muted-foreground">
                Yakunlash uchun barcha mezonlarni baholang.
              </p>
            )}
            <Button
              className="ml-auto"
              disabled={!data.complete || finalize.isPending}
              onClick={handleFinalize}
            >
              {finalize.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Amaliyotni yakunlash
            </Button>
          </div>
        )
      )}
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
      toast.error(`Ball 0 va ${criterion.max} oralig'ida butun son bo'lishi kerak`);
      setDraft(criterion.score !== null ? String(criterion.score) : "");
      return;
    }
    if (value === criterion.score) return;
    try {
      await setScore.mutateAsync({ key: criterion.key, score: value });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saqlab bo'lmadi");
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
              Avtomatik
            </Badge>
          ) : (
            <Badge variant="outline">Qo'lda</Badge>
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
            min={0}
            max={criterion.max}
            value={draft}
            disabled={setScore.isPending}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
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
