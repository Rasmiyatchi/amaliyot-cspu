import type { UUID } from "@/lib/api/types";

export type BulkDeleteResult = {
  requested: number;
  deleted: number;
  failed: { id: UUID; full_name: string | null; error: string }[];
};

/**
 * Backend bir so'rovda ko'pi bilan `size` ta ID qabul qiladi (talabalar 200, supervizorlar 100).
 * Tanlov sahifalar bo'ylab saqlangani uchun undan ko'p bo'lishi mumkin — bo'lib yuborib,
 * natijalarni birlashtiramiz.
 */
export async function bulkDeleteInBatches(
  ids: UUID[],
  size: number,
  send: (chunk: UUID[]) => Promise<BulkDeleteResult>,
): Promise<BulkDeleteResult> {
  const total: BulkDeleteResult = { requested: 0, deleted: 0, failed: [] };
  for (let i = 0; i < ids.length; i += size) {
    const res = await send(ids.slice(i, i + size));
    total.requested += res.requested;
    total.deleted += res.deleted;
    total.failed.push(...res.failed);
  }
  return total;
}
