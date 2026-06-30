import { Badge } from "@/components/ui/badge";
import type { ContractStatus } from "@/lib/api/types";

const LABEL: Record<ContractStatus, string> = {
  draft: "Yangi",
  generated: "PDF tayyor",
  active: "Faol",
  expired: "Arxiv",
  revoked: "Rad etilgan",
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
