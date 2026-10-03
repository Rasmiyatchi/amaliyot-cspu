import { useTranslation } from "react-i18next";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { StudentStatus } from "@/lib/api/types";

const STATUS_LABEL_KEY: Record<StudentStatus, string> = {
  studying: "studentsStudentsFilters.statusStudying",
  graduated: "studentsStudentsFilters.statusGraduated",
  expelled: "studentsStudentsFilters.statusExpelled",
  academic_leave: "studentsStudentsFilters.statusAcademicLeave",
};

const STATUS_VARIANT: Record<StudentStatus, NonNullable<BadgeProps["variant"]>> = {
  studying: "success",
  graduated: "secondary",
  expelled: "destructive",
  academic_leave: "warning",
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const { t } = useTranslation();
  return <Badge variant={STATUS_VARIANT[status]}>{t(STATUS_LABEL_KEY[status])}</Badge>;
}
