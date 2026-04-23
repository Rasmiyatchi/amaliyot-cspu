import { Badge } from "@/components/ui/badge";
import type { ContractStatus } from "@/lib/api/types";

const LABEL: Record<ContractStatus, string> = {
  draft: "Qoralama",
  generated: "PDF tayyor",
  active: "Aktiv",
  expired: "Muddati o'tgan",
  revoked: "Bekor qilingan",
};

const VARIANT: Record<
  ContractStatus,
  "default" | "secondary" | "destructive" | "success" | "info" | "warning" | "outline"
> = {
  draft: "outline",
  generated: "info",
  active: "success",
  expired: "secondary",
  revoked: "destructive",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
