import { useQuery } from "@tanstack/react-query";

import i18n from "@/i18n";
import { api, downloadFile } from "@/lib/api";
import type { ISODate, Paginated, UUID } from "@/lib/api/types";

/** Tahrirlashlarda eski → yangi qiymat (`metadata_json.changes`) */
export type AuditChange = { field: string; before: unknown; after: unknown };

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
  /** Toshkent kuni bo'yicha, inklyuziv */
  date_from?: ISODate;
  date_to?: ISODate;
  /** Tafsilot va kim (ism) bo'yicha */
  search?: string;
  /** Amal qilgan foydalanuvchining fakulteti (admin, talaba, supervizor) */
  faculty_id?: UUID;
  /** Ko'rsatilmaydigan amallar (masalan, har bir muvaffaqiyatli "login") */
  exclude_action?: string[];
};

export const auditLogKeys = {
  all: ["audit-logs"] as const,
  list: (f: AuditLogFilters, page: number, pageSize: number) =>
    [...auditLogKeys.all, "list", f, page, pageSize] as const,
  actions: () => [...auditLogKeys.all, "actions"] as const,
};

function filtersParams(filters: AuditLogFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.actor_user_id) p.set("actor_user_id", filters.actor_user_id);
  if (filters.action) p.set("action", filters.action);
  if (filters.entity_type) p.set("entity_type", filters.entity_type);
  if (filters.date_from) p.set("date_from", filters.date_from);
  if (filters.date_to) p.set("date_to", filters.date_to);
  if (filters.search?.trim()) p.set("search", filters.search.trim());
  if (filters.faculty_id) p.set("faculty_id", filters.faculty_id);
  for (const a of filters.exclude_action ?? []) p.append("exclude_action", a);
  return p;
}

export function useAuditLogs(filters: AuditLogFilters = {}, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: auditLogKeys.list(filters, page, pageSize),
    queryFn: () => {
      const p = filtersParams(filters);
      p.set("page", String(page));
      p.set("page_size", String(pageSize));
      return api.get(`v1/audit-logs?${p}`).json<Paginated<AuditLog>>();
    },
    placeholderData: (prev) => prev,
  });
}

/** Jurnalda haqiqatan uchragan amal turlari — filtr ro'yxati uchun. */
export function useAuditActions() {
  return useQuery({
    queryKey: auditLogKeys.actions(),
    queryFn: () => api.get("v1/audit-logs/actions").json<string[]>(),
    staleTime: 5 * 60_000,
  });
}

/** Excel eksport — joriy filtrlar bilan (serverda ko'pi bilan 10 000 qator). */
export function downloadAuditLogsXlsx(filters: AuditLogFilters): Promise<void> {
  const query = filtersParams(filters).toString();
  return downloadFile(
    `/api/v1/audit-logs/export.xlsx${query ? `?${query}` : ""}`,
    "audit.xlsx",
    i18n.t("common.downloadFailed"),
  );
}
