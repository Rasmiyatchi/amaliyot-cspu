import { Badge } from "@/components/ui/badge";
import type { TaskCategory, TaskType } from "@/lib/api/types";

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  spiritual: "Ma'naviy",
  academic: "O'quv",
  report: "Hisobot",
};

const CATEGORY_VARIANT: Record<
  TaskCategory,
  "default" | "secondary" | "success" | "info" | "warning" | "outline"
> = {
  spiritual: "info",
  academic: "success",
  report: "warning",
};

const TYPE_LABEL: Record<TaskType, string> = {
  essay: "Esse",
  event_scenario: "Tadbir ssenariysi",
  event_participation: "Tadbir ishtiroki",
  analytical_note: "Tahliliy ma'lumotnoma",
  plan: "Reja",
  protocol: "Bayonnoma",
  presentation: "Prezentatsiya",
  open_lesson: "Ochiq dars",
  test_lesson: "Sinov dars",
  lesson_analysis_batch: "Dars tahlillari",
  interactive_pack: "Interfaol to'plam",
  other: "Boshqa",
};

export function TaskCategoryBadge({ category }: { category: TaskCategory }) {
  return <Badge variant={CATEGORY_VARIANT[category]}>{CATEGORY_LABEL[category]}</Badge>;
}

export function TaskTypeLabel({ type }: { type: TaskType }) {
  return <span className="text-xs text-muted-foreground">{TYPE_LABEL[type]}</span>;
}
