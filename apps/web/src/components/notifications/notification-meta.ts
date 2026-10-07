import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { Notification, NotificationType } from "@/lib/api/types";
import type { UserRole } from "@/stores/auth";

/** Barcha turlar — filtr ro'yxati tartibi shu. */
export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  "generic",
  "attendance_rejected",
  "attendance_override",
  "task_approved",
  "task_rejected",
  "journal_approved",
  "journal_rejected",
  "analysis_approved",
  "analysis_rejected",
  "contract_generated",
  "contract_activated",
];

export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  task_approved: CheckCircle2,
  task_rejected: XCircle,
  journal_approved: CheckCircle2,
  journal_rejected: XCircle,
  analysis_approved: CheckCircle2,
  analysis_rejected: XCircle,
  attendance_rejected: CalendarCheck,
  attendance_override: ShieldCheck,
  contract_generated: FileCheck2,
  contract_activated: FileCheck2,
  generic: BookOpen,
};

export const NOTIFICATION_ACCENTS: Record<NotificationType, string> = {
  task_approved: "text-success",
  task_rejected: "text-destructive",
  journal_approved: "text-success",
  journal_rejected: "text-destructive",
  analysis_approved: "text-success",
  analysis_rejected: "text-destructive",
  attendance_rejected: "text-destructive",
  attendance_override: "text-primary",
  contract_generated: "text-info",
  contract_activated: "text-success",
  generic: "text-muted-foreground",
};

export function notificationTypeKey(type: NotificationType): string {
  return `notificationsPage.types.${type}`;
}

/** `data` ichidagi odamga tushunarli maydonlar (tafsilot oynasida qatorlar). */
export const NOTIFICATION_DATA_FIELDS: readonly {
  key: string;
  labelKey: string;
  mono?: boolean;
}[] = [
  { key: "username", labelKey: "notificationsPage.fields.username", mono: true },
  { key: "attempted_device", labelKey: "notificationsPage.fields.attemptedDevice" },
  { key: "attempted_ip", labelKey: "notificationsPage.fields.attemptedIp", mono: true },
  { key: "bound_device", labelKey: "notificationsPage.fields.boundDevice" },
  { key: "attempted_user_agent", labelKey: "notificationsPage.fields.userAgent", mono: true },
];

export type RelatedLink = { to: string; labelKey: string };

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

/** Xabardan tegishli sahifaga o'tish havolasi — rolga va `data` ga qarab. */
export function relatedLinkFor(role: UserRole, n: Notification): RelatedLink | null {
  const data = n.data ?? {};
  const username = str(data.username);
  const assignmentId = str(data.assignment_id);

  switch (role) {
    case "super_admin":
    case "admin":
      // Boshqa qurilmadan kirish urinishi → talaba kartasi (u yerda qurilmani tozalash bor).
      // /admin/structure/students — StudentsPage'ning o'zi (sidebar yo'li); ?open= kartani ochadi.
      if (data.kind === "device_blocked" && username) {
        const q = encodeURIComponent(username);
        return {
          to: `/admin/structure/students?search=${q}&open=${q}`,
          labelKey: "notificationsPage.openStudent",
        };
      }
      return null;
    case "supervisor":
      return assignmentId
        ? {
            to: `/supervisor?student=${assignmentId}`,
            labelKey: "notificationsPage.openAssignment",
          }
        : null;
    case "student":
      return assignmentId ? { to: "/student", labelKey: "notificationsPage.openDashboard" } : null;
  }
}
