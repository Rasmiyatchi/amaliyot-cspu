import {
  formatTashkentDate,
  formatTashkentDateTime,
} from "@/components/attendance/attendance-date-utils";
import { formatWeekdays } from "@/components/admin/assignments/weekday-picker";
import i18n, { dateLocale } from "@/i18n";

/** Audit/tahrir farqlaridagi maydon nomlari — topilmasa xom nomi ko'rsatiladi. */
const FIELD_KEYS: Record<string, string> = {
  required_weekdays: "auditChanges.fields.requiredWeekdays",
  supervisor_id: "auditChanges.fields.supervisor",
  start_date: "auditChanges.fields.startDate",
  end_date: "auditChanges.fields.endDate",
  semester: "auditChanges.fields.semester",
  status: "auditChanges.fields.status",
  organization_id: "auditChanges.fields.organization",
  area_id: "auditChanges.fields.area",
  cancelled_reason: "auditChanges.fields.cancelledReason",
  notes: "auditChanges.fields.notes",
  device_label: "auditChanges.fields.device",
  practice_type_id: "auditChanges.fields.practiceType",
  academic_year_id: "auditChanges.fields.academicYear",
  student_id: "auditChanges.fields.student",
};

export function fieldLabel(field: string): string {
  const key = FIELD_KEYS[field];
  return key ? i18n.t(key) : field;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const SEMESTER_KEYS: Record<string, string> = {
  fall: "common.semesterFall",
  spring: "common.semesterSpring",
};
const STATUS_KEYS: Record<string, string> = {
  draft: "adminAssignments.tabs.draft",
  active: "adminAssignments.tabs.active",
  cancelled: "adminAssignments.tabs.cancelled",
  completed: "adminAssignments.tabs.completed",
};

/** Qiymatni odamga tushunarli ko'rinishga keltiradi (hafta kunlari, sanalar, semestr…). */
export function formatChangeValue(field: string, value: unknown, label?: string | null): string {
  if (label) return label;
  if (value === null || value === undefined || value === "") return "—";
  if (field === "required_weekdays" && Array.isArray(value)) {
    return formatWeekdays(value.filter((v): v is number => typeof v === "number"));
  }
  if (typeof value === "string") {
    if (field === "semester" && SEMESTER_KEYS[value]) return i18n.t(SEMESTER_KEYS[value]);
    if (field === "status" && STATUS_KEYS[value]) return i18n.t(STATUS_KEYS[value]);
    if (ISO_DATE.test(value)) return formatTashkentDate(value, dateLocale());
    if (ISO_DATETIME.test(value)) return formatTashkentDateTime(value, dateLocale());
    return value;
  }
  if (typeof value === "boolean") return value ? i18n.t("common.yes") : i18n.t("common.no");
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
