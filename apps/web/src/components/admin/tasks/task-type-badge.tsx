import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { TaskCategory, TaskType } from "@/lib/api/types";

const CATEGORY_LABEL_KEY: Record<TaskCategory, string> = {
  spiritual: "tasksTaskTypeBadge.category.spiritual",
  academic: "tasksTaskTypeBadge.category.academic",
  report: "tasksTaskTypeBadge.category.report",
};

const CATEGORY_VARIANT: Record<
  TaskCategory,
  "default" | "secondary" | "success" | "info" | "warning" | "outline"
> = {
  spiritual: "info",
  academic: "success",
  report: "warning",
};

const TYPE_LABEL_KEY: Record<TaskType, string> = {
  essay: "tasksTaskTypeBadge.type.essay",
  event_scenario: "tasksTaskTypeBadge.type.eventScenario",
  event_participation: "tasksTaskTypeBadge.type.eventParticipation",
  analytical_note: "tasksTaskTypeBadge.type.analyticalNote",
  plan: "tasksTaskTypeBadge.type.plan",
  protocol: "tasksTaskTypeBadge.type.protocol",
  presentation: "tasksTaskTypeBadge.type.presentation",
  open_lesson: "tasksTaskTypeBadge.type.openLesson",
  test_lesson: "tasksTaskTypeBadge.type.testLesson",
  lesson_analysis_batch: "tasksTaskTypeBadge.type.lessonAnalysisBatch",
  interactive_pack: "tasksTaskTypeBadge.type.interactivePack",
  other: "tasksTaskTypeBadge.type.other",
};

export function TaskCategoryBadge({ category }: { category: TaskCategory }) {
  const { t } = useTranslation();
  return <Badge variant={CATEGORY_VARIANT[category]}>{t(CATEGORY_LABEL_KEY[category])}</Badge>;
}

export function TaskTypeLabel({ type }: { type: TaskType }) {
  const { t } = useTranslation();
  return <span className="text-xs text-muted-foreground">{t(TYPE_LABEL_KEY[type])}</span>;
}
