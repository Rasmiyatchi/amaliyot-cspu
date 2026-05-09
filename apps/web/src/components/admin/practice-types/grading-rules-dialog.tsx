import { HTTPError } from "ky";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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

const GRADER_LABEL: Record<string, string> = {
  system: "Tizim (avtomatik)",
  supervisor: "Amaliyot rahbari",
  organization: "Tashkilot rahbariyati",
  department_head: "Kafedra mudiri",
};

const DEFAULTS: Criterion[] = [
  { key: "attendance", name: "Davomat", max: 10, grader: "system" },
  { key: "events", name: "Tadbirlar ishtiroki", max: 20, grader: "organization" },
  { key: "tasks", name: "O'quv topshiriqlar", max: 60, grader: "supervisor" },
  { key: "defense", name: "Hisobot himoyasi", max: 10, grader: "department_head" },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export function GradingRulesDialog({ open, practiceType, onClose }: Props) {
  const update = useUpdatePracticeType();
  const [criteria, setCriteria] = useState<Criterion[]>(DEFAULTS);
  const [minTotal, setMinTotal] = useState<number>(60);

  useEffect(() => {
    if (!open || !practiceType) return;
    const rules = practiceType.grading_rules ?? {};
    if (Array.isArray(rules.criteria) && rules.criteria.length > 0) {
      setCriteria(rules.criteria as Criterion[]);
    } else {
      setCriteria(DEFAULTS);
    }
    setMinTotal(typeof rules.min_total === "number" ? rules.min_total : 60);
  }, [open, practiceType]);

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
      { key: `criterion_${prev.length + 1}`, name: "Yangi mezon", max: 10, grader: "supervisor" },
    ]);
  };

  const removeCriterion = (idx: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!practiceType) return;
    if (criteria.length === 0) {
      toast.error("Kamida bitta mezon kiriting");
      return;
    }
    if (total !== 100) {
      toast.error(`Mezonlar yig'indisi 100 bo'lishi shart, hozir ${total}`);
      return;
    }
    if (minTotal < 0 || minTotal > 100) {
      toast.error("Minimal ball 0-100 oralig'ida");
      return;
    }
    // Unique key check
    const keys = criteria.map((c) => c.key);
    if (new Set(keys).size !== keys.length) {
      toast.error("Mezon kalitlari (key) takrorlanmasligi kerak");
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
      toast.success("Baho shkalasi yangilandi");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !update.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Baholash shkalasi</DialogTitle>
          <DialogDescription>
            {practiceType?.name ?? ""} uchun 100 ballik tizim. Mezonlar yig'indisi
            aniq <strong>100</strong> bo'lishi shart.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-border">
            <div className="grid grid-cols-[2fr_1fr_140px_40px] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <div>Mezon</div>
              <div>Kim baholaydi</div>
              <div className="text-right">Maks ball</div>
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
                    placeholder="Masalan: Davomat"
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
                    {Object.keys(GRADER_LABEL).map((g) => (
                      <SelectItem key={g} value={g}>
                        {GRADER_LABEL[g]}
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
            Mezon qo'shish
          </Button>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium">Mezonlar yig'indisi</span>
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

          <div className="grid grid-cols-2 items-end gap-2">
            <div>
              <Label>Minimal kredit olish ball</Label>
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
                Talaba bu balldan past olsa, kredit olmaydi
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={update.isPending}>
            Bekor
          </Button>
          <Button
            onClick={handleSave}
            disabled={update.isPending || total !== 100}
          >
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
