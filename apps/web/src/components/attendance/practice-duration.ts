import type { TFunction } from "i18next";

/** Server sozlama topmasa ishlatadigan standart (backend DEFAULT_MIN_PRACTICE_MINUTES bilan bir xil). */
export const DEFAULT_PRACTICE_MINUTES = 240;
/** Admin kiritishi mumkin bo'lgan maksimal qiymat (12 soat) — backend chegarasi bilan bir xil. */
export const MAX_PRACTICE_MINUTES = 720;

/** 240 → "4 soat", 270 → "4 soat 30 daqiqa", 45 → "45 daqiqa", 0 → "cheklovsiz". */
export function formatPracticeMinutes(minutes: number, t: TFunction): string {
  if (minutes <= 0) return t("practiceHours.none");
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return t("practiceHours.hoursMinutes", { h, m });
  if (h) return t("practiceHours.hours", { h });
  return t("practiceHours.minutes", { m });
}

/** Soat va daqiqa maydonlaridan daqiqa; noto'g'ri yoki chegaradan tashqari bo'lsa — null. */
export function parsePracticeMinutes(hours: string, minutes: string): number | null {
  const h = hours.trim() === "" ? 0 : Number(hours);
  const m = minutes.trim() === "" ? 0 : Number(minutes);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0 || m > 59) return null;
  const total = h * 60 + m;
  return total <= MAX_PRACTICE_MINUTES ? total : null;
}
