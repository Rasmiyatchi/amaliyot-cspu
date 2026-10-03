/** Qidiruv uchun matnni solishtirishga tayyorlash: kichik harf, apostrof turlari (o'/oʻ/o‘) farqsiz. */
export function normalizeSearchText(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/['`ʻʼ‘’"]/g, "")
    .trim();
}
