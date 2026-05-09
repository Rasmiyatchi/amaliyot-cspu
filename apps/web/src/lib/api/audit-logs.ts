import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Paginated, UUID } from "@/lib/api/types";

export type AuditLog = {
  id: UUID;
  actor_user_id: UUID | null;
  actor_role: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: UUID | null;
  summary: string;
  metadata_json: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export type AuditLogFilters = {
  actor_user_id?: UUID;
  action?: string;
  entity_type?: string;
};

export const auditLogKeys = {
  all: ["audit-logs"] as const,
  list: (f: AuditLogFilters, page: number, pageSize: number) =>
    [...auditLogKeys.all, "list", f, page, pageSize] as const,
};

export function useAuditLogs(filters: AuditLogFilters = {}, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: auditLogKeys.list(filters, page, pageSize),
    queryFn: () => {
      const p = new URLSearchParams();
      p.set("page", String(page));
      p.set("page_size", String(pageSize));
      if (filters.actor_user_id) p.set("actor_user_id", filters.actor_user_id);
      if (filters.action) p.set("action", filters.action);
      if (filters.entity_type) p.set("entity_type", filters.entity_type);
      return api.get(`v1/audit-logs?${p}`).json<Paginated<AuditLog>>();
    },
  });
}
