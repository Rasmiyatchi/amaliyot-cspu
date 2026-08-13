import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { Attachment } from "@/lib/api/uploads";
import type { UUID } from "@/lib/api/types";

export type DocumentKind = "regulation" | "program";

export type DocumentEntity = {
  id: UUID;
  kind: DocumentKind;
  practice_type_id: UUID | null;
  practice_type_name: string | null;
  course: number | null;
  education_form: string | null;
  direction_id: UUID | null;
  title: string;
  description: string | null;
  file_attachment: Attachment;
  created_by_id: UUID | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentCreatePayload = {
  kind: DocumentKind;
  practice_type_id?: UUID | null;
  course?: number | null;
  education_form?: string | null;
  direction_id?: UUID | null;
  title: string;
  description?: string | null;
  file_attachment: Attachment;
};

export type DocumentUpdatePayload = Partial<Omit<DocumentCreatePayload, "kind">>;

export const documentKeys = {
  all: ["documents"] as const,
  list: (kind?: DocumentKind, practiceTypeId?: UUID) =>
    [...documentKeys.all, "list", kind, practiceTypeId] as const,
};

export function useDocuments(filters: { kind?: DocumentKind; practiceTypeId?: UUID; course?: number; educationForm?: string; directionId?: UUID } = {}) {
  return useQuery({
    queryKey: [...documentKeys.list(filters.kind, filters.practiceTypeId), filters.course, filters.educationForm, filters.directionId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters.kind) p.set("kind", filters.kind);
      if (filters.practiceTypeId) p.set("practice_type_id", filters.practiceTypeId);
      if (filters.course !== undefined) p.set("course", String(filters.course));
      if (filters.educationForm) p.set("education_form", filters.educationForm);
      if (filters.directionId) p.set("direction_id", filters.directionId);
      return api.get(`v1/documents?${p.toString()}`).json<DocumentEntity[]>();
    },
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DocumentCreatePayload) =>
      api.post("v1/documents", { json: data }).json<DocumentEntity>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.all }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: DocumentUpdatePayload }) =>
      api.patch(`v1/documents/${id}`, { json: data }).json<DocumentEntity>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.all }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.all }),
  });
}

export async function uploadStandaloneFile(file: File): Promise<Attachment> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error(i18n.t("common.sessionExpired"));
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/v1/uploads/standalone", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = `Yuklashda xato (${res.status})`;
    try {
      const j = JSON.parse(text);
      if (j.detail) msg = j.detail;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { attachment: Attachment };
  return data.attachment;
}
