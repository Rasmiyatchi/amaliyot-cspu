import { Badge } from "@/components/ui/badge";
import type { AssignmentStatus } from "@/lib/api/types";

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  draft: "Qoralama",
  active: "Aktiv",
  completed: "Tugagan",
  cancelled: "Bekor qilingan",
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
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
