import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { AssignmentStatus } from "@/lib/api/types";

const STATUS_LABEL_KEY: Record<AssignmentStatus, string> = {
  draft: "assignmentsAssignmentStatusBadge.draft",
  active: "assignmentsAssignmentStatusBadge.active",
  completed: "assignmentsAssignmentStatusBadge.completed",
  cancelled: "assignmentsAssignmentStatusBadge.cancelled",
};

const STATUS_VARIANT: Record<
  AssignmentStatus,
  "default" | "secondary" | "destructive" | "success" | "warning" | "outline"
> = {
  draft: "outline",
  active: "success",
  completed: "secondary",
  cancelled: "destructive",
};

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  const { t } = useTranslation();
  return <Badge variant={STATUS_VARIANT[status]}>{t(STATUS_LABEL_KEY[status])}</Badge>;
}
