import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  Notification,
  NotificationUnreadCount,
  Paginated,
  UUID,
} from "@/lib/api/types";

const REFETCH_MS = 30_000;

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (unreadOnly: boolean, page: number) =>
    [...notificationKeys.all, "list", unreadOnly, page] as const,
  unread: ["notifications", "unread-count"] as const,
};

export function useNotifications(unreadOnly = false, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: notificationKeys.list(unreadOnly, page),
    queryFn: () => {
      const p = new URLSearchParams();
      p.set("page", String(page));
      p.set("page_size", String(pageSize));
      if (unreadOnly) p.set("unread", "true");
      return api
        .get(`v1/notifications?${p.toString()}`)
        .json<Paginated<Notification>>();
    },
    refetchInterval: REFETCH_MS,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () =>
      api.get("v1/notifications/unread-count").json<NotificationUnreadCount>(),
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
