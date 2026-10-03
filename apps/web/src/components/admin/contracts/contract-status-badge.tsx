import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { ContractStatus } from "@/lib/api/types";

const LABEL_KEY: Record<ContractStatus, string> = {
  draft: "contractsContractStatusBadge.draft",
  generated: "contractsContractStatusBadge.generated",
  active: "contractsContractStatusBadge.active",
  expired: "contractsContractStatusBadge.expired",
  revoked: "contractsContractStatusBadge.revoked",
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
  const { t } = useTranslation();
  return <Badge variant={VARIANT[status]}>{t(LABEL_KEY[status])}</Badge>;
}
