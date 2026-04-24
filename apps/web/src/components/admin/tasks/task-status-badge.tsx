import { Badge } from "@/components/ui/badge";
import type { JournalStatus, TaskStatus } from "@/lib/api/types";

const TASK_LABEL: Record<TaskStatus, string> = {
  not_started: "Boshlanmagan",
  submitted: "Yuborilgan",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
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

const JOURNAL_LABEL: Record<JournalStatus, string> = {
  draft: "Qoralama",
  submitted: "Yuborilgan",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
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
  return <Badge variant={TASK_VARIANT[status]}>{TASK_LABEL[status]}</Badge>;
}

export function JournalStatusBadge({ status }: { status: JournalStatus }) {
  return <Badge variant={JOURNAL_VARIANT[status]}>{JOURNAL_LABEL[status]}</Badge>;
}
