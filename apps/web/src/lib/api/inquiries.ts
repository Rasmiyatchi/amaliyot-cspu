import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { UUID } from "@/lib/api/types";

export type InquiryMessage = {
  id: UUID;
  from_admin: boolean;
  sender_id: UUID | null;
  body: string;
  created_at: string;
};

export type Inquiry = {
  id: UUID;
  student_id: UUID;
  student_name: string | null;
  subject: string;
  is_resolved: boolean;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InquiryDetail = Inquiry & { messages: InquiryMessage[] };

const KEY = ["inquiries"] as const;

// ─── Talaba ───────────────────────────────────────────────
export function useMyInquiries() {
  return useQuery({
    queryKey: [...KEY, "my"],
    queryFn: () => api.get("v1/inquiries/my").json<Inquiry[]>(),
  });
}

export function useCreateInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { subject: string; body: string }) =>
      api.post("v1/inquiries", { json: data }).json<Inquiry>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// ─── Admin ────────────────────────────────────────────────
export function useInquiries(resolved?: boolean) {
  const qs = new URLSearchParams();
  if (resolved !== undefined) qs.set("resolved", String(resolved));
  return useQuery({
    queryKey: [...KEY, "all", resolved ?? "any"],
    queryFn: () => api.get(`v1/inquiries?${qs}`).json<Inquiry[]>(),
    placeholderData: (prev) => prev,
  });
}

export function useResolveInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolved }: { id: UUID; resolved: boolean }) =>
      api.post(`v1/inquiries/${id}/resolve?resolved=${resolved}`).json<Inquiry>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// ─── Umumiy ───────────────────────────────────────────────
export function useInquiry(id: UUID | null) {
  return useQuery({
    queryKey: [...KEY, "detail", id],
    enabled: !!id,
    queryFn: () => api.get(`v1/inquiries/${id}`).json<InquiryDetail>(),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: UUID; body: string }) =>
      api.post(`v1/inquiries/${id}/messages`, { json: { body } }).json<InquiryDetail>(),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, "detail", vars.id] });
    },
  });
}
