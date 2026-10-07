import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  ISODate,
  Notification,
  NotificationSummary,
  NotificationType,
  NotificationUnreadCount,
  Paginated,
  UUID,
} from "@/lib/api/types";

const REFETCH_MS = 30_000;

export type NotificationFilters = {
  /** Faqat o'qilmaganlar */
  unread?: boolean;
  types?: NotificationType[];
  /** Sarlavha, matn va ma'lumot (login, qurilma) bo'yicha */
  search?: string;
  /** Toshkent kuni bo'yicha, ikkalasi ham inklyuziv */
  date_from?: ISODate;
  date_to?: ISODate;
};

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (filters: NotificationFilters, page: number, pageSize: number) =>
    [...notificationKeys.lists(), filters, page, pageSize] as const,
  detail: (id: UUID) => [...notificationKeys.all, "detail", id] as const,
  unread: ["notifications", "unread-count"] as const,
  summary: ["notifications", "summary"] as const,
};

function qs(filters: NotificationFilters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  if (filters.unread) p.set("unread", "true");
  for (const t of filters.types ?? []) p.append("type", t);
  if (filters.search?.trim()) p.set("search", filters.search.trim());
  if (filters.date_from) p.set("date_from", filters.date_from);
  if (filters.date_to) p.set("date_to", filters.date_to);
  return p.toString();
}

export function useNotifications(filters: NotificationFilters = {}, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: notificationKeys.list(filters, page, pageSize),
    queryFn: () =>
      api.get(`v1/notifications?${qs(filters, page, pageSize)}`).json<Paginated<Notification>>(),
    placeholderData: (prev) => prev,
    refetchInterval: REFETCH_MS,
  });
}

export function useNotification(id: UUID | null) {
  return useQuery({
    queryKey: notificationKeys.detail(id ?? ""),
    queryFn: () => api.get(`v1/notifications/${id}`).json<Notification>(),
    enabled: !!id,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => api.get("v1/notifications/unread-count").json<NotificationUnreadCount>(),
    refetchInterval: REFETCH_MS,
  });
}

export function useNotificationSummary() {
  return useQuery({
    queryKey: notificationKeys.summary,
    queryFn: () => api.get("v1/notifications/summary").json<NotificationSummary>(),
    refetchInterval: REFETCH_MS,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.post(`v1/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("v1/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
