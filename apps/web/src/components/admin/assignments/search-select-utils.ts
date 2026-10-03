/**
 * Qidiruv matnini solishtirish uchun normallashtirish — backend (services/student.py)
 * bilan bir xil qoida: kichik harf, barcha tutuq belgilari (' ’ ‘ ʻ ʼ ` ") olib tashlanadi,
 * ortiqcha bo'shliqlar yig'iladi. HEMIS eksportidagi "O’rinov" va qo'lda yozilgan
 * "O'rinov" / "Orinov" bir xil topiladi.
 */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/['’‘ʻʼ`"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** So'rovning har bir so'zi (tartibidan qat'i nazar) matnda uchrasa — mos. */
export function matchesSearch(haystack: string, query: string): boolean {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return true;
  const normHaystack = normalizeSearchText(haystack);
  return normQuery.split(" ").every((token) => normHaystack.includes(token));
}
