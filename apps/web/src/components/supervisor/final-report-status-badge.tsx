import { CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { FinalReportStatus } from "@/lib/api/final-reports";

const VIEW: Record<
  FinalReportStatus,
  { labelKey: string; variant: "secondary" | "success" | "destructive" | "warning"; icon: typeof Clock }
> = {
  draft: { labelKey: "adminReports.status.draft", variant: "secondary", icon: FileText },
  submitted: { labelKey: "adminReports.status.submitted", variant: "warning", icon: Clock },
  approved: { labelKey: "adminReports.status.approved", variant: "success", icon: CheckCircle2 },
  rejected: { labelKey: "adminReports.status.rejected", variant: "destructive", icon: XCircle },
};

/** Yakuniy hisobot holati — tarjima qilingan yorliq (enum matni emas). */
export function FinalReportStatusBadge({
  status,
  compact = false,
}: {
  status: FinalReportStatus;
  /** Jadval ichida: "Hisobot: Kutilmoqda" ko'rinishida, kichik */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const view = VIEW[status];
  const Icon = view.icon;
  const label = t(view.labelKey);
  return (
    <Badge
      variant={view.variant}
      className={compact ? "gap-1 whitespace-nowrap px-1.5 py-0 text-[10px]" : "gap-1 whitespace-nowrap"}
    >
      <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
      {compact ? t("supervisorReports.statusShort", { status: label }) : label}
    </Badge>
  );
}
