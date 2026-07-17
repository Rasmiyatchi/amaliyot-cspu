import { HTTPError } from "ky";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdatePracticeType } from "@/lib/api/practice-types";
import type { PracticeType } from "@/lib/api/types";

type Props = {
  open: boolean;
  practiceType: PracticeType | null;
  onClose: () => void;
};

type Criterion = {
  key: string;
  name: string;
  max: number;
  grader: "system" | "supervisor" | "organization" | "department_head";
};

const GRADER_LABEL_KEY: Record<string, string> = {
  system: "practiceTypesGradingRulesDialog.grader.system",
  supervisor: "practiceTypesGradingRulesDialog.grader.supervisor",
  organization: "practiceTypesGradingRulesDialog.grader.organization",
  department_head: "practiceTypesGradingRulesDialog.grader.departmentHead",
};

type DefaultCriterion = Omit<Criterion, "name"> & { nameKey: string };

const DEFAULTS: DefaultCriterion[] = [
  { key: "attendance", nameKey: "practiceTypesGradingRulesDialog.defaults.attendance", max: 10, grader: "system" },
  { key: "events", nameKey: "practiceTypesGradingRulesDialog.defaults.events", max: 20, grader: "organization" },
  { key: "tasks", nameKey: "practiceTypesGradingRulesDialog.defaults.tasks", max: 60, grader: "supervisor" },
  { key: "defense", nameKey: "practiceTypesGradingRulesDialog.defaults.defense", max: 10, grader: "department_head" },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export function GradingRulesDialog({ open, practiceType, onClose }: Props) {
  const { t } = useTranslation();
  const update = useUpdatePracticeType();
  const [criteria, setCriteria] = useState<Criterion[]>(() =>
    DEFAULTS.map(({ nameKey, ...c }) => ({ ...c, name: t(nameKey) })),
  );
  const [minTotal, setMinTotal] = useState<number>(60);

  useEffect(() => {
    if (!open || !practiceType) return;
    const rules = practiceType.grading_rules ?? {};
    if (Array.isArray(rules.criteria) && rules.criteria.length > 0) {
      setCriteria(rules.criteria as Criterion[]);
    } else {
      setCriteria(DEFAULTS.map(({ nameKey, ...c }) => ({ ...c, name: t(nameKey) })));
    }
    setMinTotal(typeof rules.min_total === "number" ? rules.min_total : 60);
  }, [open, practiceType, t]);

  const total = criteria.reduce((acc, c) => acc + (Number(c.max) || 0), 0);

  const updateCriterion = <K extends keyof Criterion>(
    idx: number,
    key: K,
    value: Criterion[K],
  ) => {
    setCriteria((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const next = { ...c, [key]: value };
        if (key === "name" && (!c.key || c.key === slugify(c.name))) {
          next.key = slugify(value as string);
        }
        return next;
      }),
    );
  };

  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      { key: `criterion_${prev.length + 1}`, name: t("practiceTypesGradingRulesDialog.newCriterion"), max: 10, grader: "supervisor" },
    ]);
  };

  const removeCriterion = (idx: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!practiceType) return;
    if (criteria.length === 0) {
      toast.error(t("practiceTypesGradingRulesDialog.atLeastOneCriterion"));
      return;
    }
    if (total !== 100) {
      toast.error(t("practiceTypesGradingRulesDialog.totalMustBe100", { total }));
      return;
    }
    if (minTotal < 0 || minTotal > 100) {
      toast.error(t("practiceTypesGradingRulesDialog.minTotalRange"));
      return;
    }
    // Unique key check
    const keys = criteria.map((c) => c.key);
    if (new Set(keys).size !== keys.length) {
      toast.error(t("practiceTypesGradingRulesDialog.uniqueKeys"));
      return;
    }

    try {
      await update.mutateAsync({
        id: practiceType.id,
        data: {
          grading_rules: {
            criteria,
            min_total: minTotal,
          },
        },
      });
      toast.success(t("practiceTypesGradingRulesDialog.savedToast"));
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !update.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("practiceTypesGradingRulesDialog.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="practiceTypesGradingRulesDialog.description"
              values={{ name: practiceType?.name ?? "" }}
              components={[<strong key="0" />]}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-border">
            <div className="grid grid-cols-[2fr_1fr_140px_40px] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <div>{t("practiceTypesGradingRulesDialog.criterionColumn")}</div>
              <div>{t("practiceTypesGradingRulesDialog.graderColumn")}</div>
              <div className="text-right">{t("practiceTypesGradingRulesDialog.maxColumn")}</div>
              <div></div>
            </div>
            {criteria.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-[2fr_1fr_140px_40px] items-end gap-2 border-b border-border px-3 py-2 last:border-0"
              >
                <div>
                  <Input
                    value={c.name}
                    onChange={(e) => updateCriterion(i, "name", e.target.value)}
                    placeholder={t("practiceTypesGradingRulesDialog.criterionPlaceholder")}
                  />
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    key: {c.key}
                  </div>
                </div>
                <Select
                  value={c.grader}
                  onValueChange={(v) => updateCriterion(i, "grader", v as Criterion["grader"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(GRADER_LABEL_KEY).map((g) => (
                      <SelectItem key={g} value={g}>
                        {t(GRADER_LABEL_KEY[g]!)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={c.max}
                  onChange={(e) =>
                    updateCriterion(i, "max", Number(e.target.value) || 0)
                  }
                  className="text-right"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeCriterion(i)}
                  disabled={criteria.length <= 1}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addCriterion}>
            <Plus className="h-4 w-4" />
            {t("practiceTypesGradingRulesDialog.addCriterion")}
          </Button>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium">{t("practiceTypesGradingRulesDialog.totalLabel")}</span>
            <span
              className={
                "font-mono text-lg font-bold " +
                (total === 100
                  ? "text-success"
                  : "text-destructive")
              }
            >
              {total} / 100
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-end gap-2">
            <div>
              <Label>{t("practiceTypesGradingRulesDialog.minTotalLabel")}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={minTotal}
                onChange={(e) => setMinTotal(Number(e.target.value) || 0)}
              />
            </div>
            <Alert className="m-0">
              <AlertDescription className="text-xs">
                {t("practiceTypesGradingRulesDialog.minTotalHint")}
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={update.isPending}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={update.isPending || total !== 100}
          >
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
