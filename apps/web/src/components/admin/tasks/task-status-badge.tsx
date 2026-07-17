import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { JournalStatus, TaskStatus } from "@/lib/api/types";

const TASK_LABEL_KEY: Record<TaskStatus, string> = {
  not_started: "tasksTaskStatusBadge.notStarted",
  submitted: "tasksTaskStatusBadge.submitted",
  approved: "tasksTaskStatusBadge.approved",
  rejected: "tasksTaskStatusBadge.rejected",
};

const TASK_VARIANT: Record<
  TaskStatus,
  "default" | "secondary" | "destructive" | "success" | "info" | "warning" | "outline"
> = {
  not_started: "outline",
  submitted: "info",
  approved: "success",
  rejected: "destructive",
};

const JOURNAL_LABEL_KEY: Record<JournalStatus, string> = {
  draft: "tasksTaskStatusBadge.draft",
  submitted: "tasksTaskStatusBadge.submitted",
  approved: "tasksTaskStatusBadge.approved",
  rejected: "tasksTaskStatusBadge.rejected",
};

const JOURNAL_VARIANT: Record<
  JournalStatus,
  "default" | "secondary" | "destructive" | "success" | "info" | "warning" | "outline"
> = {
  draft: "outline",
  submitted: "info",
  approved: "success",
  rejected: "destructive",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useTranslation();
  return <Badge variant={TASK_VARIANT[status]}>{t(TASK_LABEL_KEY[status])}</Badge>;
}

export function JournalStatusBadge({ status }: { status: JournalStatus }) {
  const { t } = useTranslation();
  return <Badge variant={JOURNAL_VARIANT[status]}>{t(JOURNAL_LABEL_KEY[status])}</Badge>;
}
