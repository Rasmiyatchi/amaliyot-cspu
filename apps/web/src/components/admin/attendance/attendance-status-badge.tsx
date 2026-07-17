import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { AttendanceDayStatus } from "@/lib/api/types";

const LABEL_KEY: Record<AttendanceDayStatus, string> = {
  pending: "attendanceAttendanceStatusBadge.status.pending",
  green: "attendanceAttendanceStatusBadge.status.green",
  red: "attendanceAttendanceStatusBadge.status.red",
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
  const { t } = useTranslation();
  return <Badge variant={VARIANT[status]}>{t(LABEL_KEY[status])}</Badge>;
}
