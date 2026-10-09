import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { notificationKeys } from "@/lib/api/notifications";
import type { ISODateTime, Paginated, UUID } from "@/lib/api/types";

/** Kimga: barcha talabalar, fakultet, guruh, tanlangan talabalar, supervizorlar, hammaga */
export type BroadcastAudience =
  | "all_students"
  | "faculty"
  | "group"
  | "students"
  | "supervisors"
  | "everyone";

export const BROADCAST_AUDIENCES: readonly BroadcastAudience[] = [
  "all_students",
  "faculty",
  "group",
  "students",
  "supervisors",
  "everyone",
];

export type BroadcastCreate = {
  audience: BroadcastAudience;
  faculty_id?: UUID | null;
  group_id?: UUID | null;
  student_ids?: UUID[];
  subject: string;
  body: string;
};

export type Broadcast = {
  id: UUID;
  sender_id: UUID | null;
  sender_name: string | null;
  audience: BroadcastAudience;
  faculty_id: UUID | null;
  faculty_name: string | null;
  group_id: UUID | null;
  group_name: string | null;
  target_user_ids: UUID[] | null;
  subject: string;
  body: string;
  recipients_count: number;
  sent_at: ISODateTime;
  created_at: ISODateTime;
};

export type BroadcastPreview = {
  recipients_count: number;
  faculty_name: string | null;
  group_name: string | null;
};

export const broadcastKeys = {
  all: ["broadcasts"] as const,
  list: (page: number, pageSize: number) => [...broadcastKeys.all, "list", page, pageSize] as const,
  detail: (id: UUID) => [...broadcastKeys.all, "detail", id] as const,
};

export function useBroadcasts(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: broadcastKeys.list(page, pageSize),
    queryFn: () =>
      api
        .get(`v1/notifications/broadcasts?page=${page}&page_size=${pageSize}`)
        .json<Paginated<Broadcast>>(),
    placeholderData: (prev) => prev,
  });
}

export function useBroadcast(id: UUID | null) {
  return useQuery({
    queryKey: broadcastKeys.detail(id ?? ""),
    queryFn: () => api.get(`v1/notifications/broadcasts/${id}`).json<Broadcast>(),
    enabled: !!id,
  });
}

/** Qabul qiluvchilar sonini hisoblash — hech narsa yuborilmaydi. */
export function usePreviewBroadcast() {
  return useMutation({
    mutationFn: (data: BroadcastCreate) =>
      api.post("v1/notifications/broadcasts/preview", { json: data }).json<BroadcastPreview>(),
  });
}

export function useSendBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BroadcastCreate) =>
      api.post("v1/notifications/broadcasts", { json: data, timeout: 120_000 }).json<Broadcast>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: broadcastKeys.all });
      // Yuboruvchi o'zi ham supervizor/talaba bo'lmaydi, lekin ro'yxatlar yangilansin
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
