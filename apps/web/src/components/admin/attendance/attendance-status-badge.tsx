import { Badge } from "@/components/ui/badge";
import type { AttendanceDayStatus } from "@/lib/api/types";

const LABEL: Record<AttendanceDayStatus, string> = {
  pending: "Kutilmoqda",
  green: "Yashil",
  red: "Qizil",
};

const VARIANT: Record<
  AttendanceDayStatus,
  "default" | "secondary" | "destructive" | "success" | "info" | "warning" | "outline"
> = {
  pending: "warning",
  green: "success",
  red: "destructive",
};

export function AttendanceStatusBadge({ status }: { status: AttendanceDayStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
