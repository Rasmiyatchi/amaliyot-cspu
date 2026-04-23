import { Badge } from "@/components/ui/badge";
import type { StudentStatus } from "@/lib/api/types";

const STATUS_LABELS: Record<StudentStatus, string> = {
  studying: "O'qiyapti",
  graduated: "Bitirgan",
  expelled: "Haydalgan",
  academic_leave: "Akademik ta'til",
};

const STATUS_VARIANT: Record<
  StudentStatus,
  "default" | "secondary" | "destructive" | "success" | "warning" | "outline"
> = {
  studying: "success",
  graduated: "secondary",
  expelled: "destructive",
  academic_leave: "warning",
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}
