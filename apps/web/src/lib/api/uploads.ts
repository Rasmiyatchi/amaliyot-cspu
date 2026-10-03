import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import i18n from "@/i18n";
import { api, authFetch, readErrorDetail, saveBlob } from "@/lib/api";
import { taskKeys } from "@/lib/api/tasks";
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

/** Entity'lardagi (topshiriq/kundalik/tahlil) biriktirma — eski yozuvlarda ba'zi maydonlar yo'q. */
export type AttachmentLike = Pick<Attachment, "name" | "path"> & Partial<Attachment>;

export const uploadKeys = {
  all: ["uploads"] as const,
  assignment: (assignmentId: UUID) => [...uploadKeys.all, "assignment", assignmentId] as const,
};

/** Storage yo'lini URL'ga xavfsiz qo'shish (bo'shliq, #, ? va h.k. segment ichida qoladi). */
function fileUrl(path: string): string {
  return `/api/v1/uploads/file/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Biriktirma o'zgarganda: topshiriq/kundalik/tahlil ro'yxatlari (hammasi `["tasks", ...]`)
 *  va talabaning "Hujjatlar" kartasi (`["uploads", "assignment", id]`) yangilansin. */
function invalidateAttachmentQueries(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: taskKeys.all });
  void qc.invalidateQueries({ queryKey: uploadKeys.all });
}

async function postFile(
  url: string,
  file: File,
): Promise<{ attachment: Attachment; all: Attachment[] }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await authFetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await readErrorDetail(res, i18n.t("apiFiles.uploadFailed")));
  return (await res.json()) as { attachment: Attachment; all: Attachment[] };
}

export function useUploadAttachment(kind: AttachmentKind, entityId: UUID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => postFile(`/api/v1/uploads/entity/${kind}/${entityId}`, file),
    onSuccess: () => invalidateAttachmentQueries(qc),
  });
}

export function useDeleteAttachment(kind: AttachmentKind, entityId: UUID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await authFetch(
        `/api/v1/uploads/entity/${kind}/${entityId}/${encodeURIComponent(attachmentId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(await readErrorDetail(res, i18n.t("common.deleteError")));
    },
    onSuccess: () => invalidateAttachmentQueries(qc),
  });
}

export type AttachmentWithSource = Attachment & {
  source: AttachmentKind;
  source_id: UUID;
};

export function useAssignmentAttachments(assignmentId: UUID | null) {
  return useQuery({
    queryKey: assignmentId ? uploadKeys.assignment(assignmentId) : [],
    enabled: !!assignmentId,
    queryFn: () =>
      api.get(`v1/uploads/assignments/${assignmentId}/all`).json<AttachmentWithSource[]>(),
  });
}

/** Fayl tarkibini (token + 401→refresh bilan) Blob sifatida olish — ko'rish oynasi uchun. */
export async function fetchAttachmentBlob(att: Pick<Attachment, "path">): Promise<Blob> {
  const res = await authFetch(fileUrl(att.path));
  if (!res.ok) throw new Error(await readErrorDetail(res, i18n.t("filePreviewModal.loadFailed")));
  return res.blob();
}

/**
 * Faylni yuklab olish. Server diskdagi (tasodifiy) nomni qaytaradi, shuning uchun saqlashda
 * foydalanuvchi yuklagan asl nom (`att.name`) ishlatiladi.
 */
export async function downloadAttachment(att: Pick<Attachment, "name" | "path">): Promise<void> {
  const res = await authFetch(fileUrl(att.path));
  if (!res.ok) throw new Error(await readErrorDetail(res, i18n.t("common.downloadError")));
  saveBlob(await res.blob(), att.name);
}
