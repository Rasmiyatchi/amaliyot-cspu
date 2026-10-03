import type { TFunction } from "i18next";
import { HTTPError, TimeoutError } from "ky";

/**
 * So'rov xatosining turi:
 *  - http    — server javob berdi (status + `detail`);
 *  - timeout — ky vaqt chegarasi tugadi (so'rov serverda bajarilgan bo'lishi MUMKIN);
 *  - offline — qurilma internetga ulanmagan;
 *  - network — fetch umuman bajarilmadi (DNS, uzilish, CORS);
 *  - other   — boshqa (masalan, yordamchi funksiya tashlagan lokalizatsiyalangan Error).
 */
export type RequestErrorKind = "http" | "timeout" | "offline" | "network" | "other";

/** Brauzerlar fetch tarmoq xatosini turlicha yozadi: Chrome / Safari / Firefox. */
const NETWORK_MESSAGE_RE = /failed to fetch|load failed|networkerror|network request failed/i;

export function requestErrorKind(e: unknown): RequestErrorKind {
  if (e instanceof HTTPError) return "http";
  if (e instanceof TimeoutError) return "timeout";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  if (e instanceof TypeError && NETWORK_MESSAGE_RE.test(e.message)) return "network";
  return "other";
}

/** ky `beforeError` server `detail`ini `message`ga yozadi; yozmagan bo'lsa standart matn qoladi. */
function serverDetail(e: HTTPError): string | null {
  const msg = e.message.trim();
  return msg && !/^Request failed with status/i.test(msg) ? msg : null;
}

/**
 * Foydalanuvchiga ko'rsatiladigan xato matni. Tarmoq/timeout xatolari umumiy "Xatolik"
 * o'rniga aniq tushuntiriladi; server xatosi bo'lsa uning `detail`i ko'rsatiladi.
 */
export function describeRequestError(
  e: unknown,
  t: TFunction,
  fallbackKey = "common.error",
): string {
  switch (requestErrorKind(e)) {
    case "http": {
      const err = e as HTTPError;
      const detail = serverDetail(err);
      if (detail) return detail;
      return err.response.status >= 500 ? t("requestError.server") : t(fallbackKey);
    }
    case "timeout":
      return t("requestError.timeout");
    case "offline":
      return t("requestError.offline");
    case "network":
      return t("requestError.network");
    default:
      return e instanceof Error && e.message ? e.message : t(fallbackKey);
  }
}
