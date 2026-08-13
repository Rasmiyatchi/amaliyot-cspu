import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";

import { useAuthStore } from "@/stores/auth";
import type { UUID } from "@/lib/api/types";

export type AttachmentKind = "task" | "journal" | "analysis";

export type Attachment = {
  id: string;
  name: string;
  path: string;
  mime: string;
  size: number;
  uploaded_at: string;
  uploaded_by_id: string;
};

async function postFile(
  url: string,
  file: File,
): Promise<{ attachment: Attachment; all: Attachment[] }> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error(i18n.t("common.sessionExpired"));
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(url, {
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
  return res.json();
}

export function useUploadAttachment(kind: AttachmentKind, entityId: UUID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      postFile(`/api/v1/uploads/entity/${kind}/${entityId}`, file),
    onSuccess: () => {
      if (kind === "task") qc.invalidateQueries({ queryKey: ["tasks"] });
      else if (kind === "journal") qc.invalidateQueries({ queryKey: ["journal"] });
      else if (kind === "analysis") qc.invalidateQueries({ queryKey: ["analyses"] });
    },
  });
}

export function useDeleteAttachment(kind: AttachmentKind, entityId: UUID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(
        `/api/v1/uploads/entity/${kind}/${entityId}/${attachmentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error(i18n.t("common.deleteError"));
    },
    onSuccess: () => {
      if (kind === "task") qc.invalidateQueries({ queryKey: ["tasks"] });
      else if (kind === "journal") qc.invalidateQueries({ queryKey: ["journal"] });
      else if (kind === "analysis") qc.invalidateQueries({ queryKey: ["analyses"] });
    },
  });
}

export type AttachmentWithSource = Attachment & {
  source: AttachmentKind;
  source_id: UUID;
};

export function useAssignmentAttachments(assignmentId: UUID | null) {
  return useQuery({
    queryKey: assignmentId
      ? (["uploads", "assignment", assignmentId] as const)
      : [],
    enabled: !!assignmentId,
    queryFn: async () => {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(
        `/api/v1/uploads/assignments/${assignmentId}/all`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(i18n.t("common.downloadFailed"));
      return res.json() as Promise<AttachmentWithSource[]>;
    },
  });
}

/** Auth bilan faylni yuklab olish va browser'da saqlash. */
export async function downloadAttachment(
  att: Pick<Attachment, "name" | "path">,
): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`/api/v1/uploads/file/${att.path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(i18n.t("common.downloadError"));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = att.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
