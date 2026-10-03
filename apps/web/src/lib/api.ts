import ky, { HTTPError } from "ky";

import i18n from "@/i18n";
import { useAuthStore } from "@/stores/auth";

const AUTH_PATH_PREFIX = "auth/"; // login/refresh/logout — retry cyclini oldini olish uchun

/**
 * HTTP klient — Authorization header va 401 da avto-refresh bilan.
 *
 * Oqim:
 *  1. beforeRequest: store'dan accessToken olib, `Authorization: Bearer ...` qo'shiladi
 *  2. 401 qaytsa va bu auth endpoint bo'lmasa → /auth/refresh chaqiriladi
 *     (bir vaqtda kelgan bir nechta 401 BITTA refresh so'rovini kutadi — single-flight)
 *  3. Yangi access token bilan original so'rov qayta yuboriladi
 *  4. Refresh aniq 401/403 qaytarsa → auth store tozalanadi (login'ga yo'naltiriladi).
 *     Tarmoq xatosi (fetch throw, 5xx) bo'lsa — store SAQLANADI: internet uzilgani
 *     foydalanuvchini chiqarib yuborishga sabab bo'lmasligi kerak.
 *
 * `beforeError` server `detail`ini `error.message`ga yozadi; `error.response.status`
 * o'zgarishsiz qoladi — UI status bo'yicha xabarni ajrata oladi.
 */
export const api = ky.create({
  prefixUrl: "/api",
  credentials: "include",
  timeout: 10_000,
  retry: 0, // biz o'zimiz retry qilamiz
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken;
        if (token) request.headers.set("Authorization", `Bearer ${token}`);
        // Backend xato xabarlarini joriy tilda qaytarsin
        request.headers.set("Accept-Language", i18n.language.startsWith("ru") ? "ru" : "uz");
      },
    ],
    beforeError: [
      async (error) => {
        try {
          const body = (await error.response.clone().json()) as { detail?: unknown };
          if (body.detail) {
            const detail = body.detail;
            error.message =
              typeof detail === "string"
                ? detail
                : Array.isArray(detail)
                  ? detail
                      .map((e: unknown) =>
                        e && typeof e === "object" && "msg" in e
                          ? String((e as { msg: unknown }).msg)
                          : JSON.stringify(e),
                      )
                      .join(", ")
                  : JSON.stringify(detail);
          }
        } catch {
          /* JSON emas */
        }
        return error;
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        if (response.status !== 401) return;
        // Auth endpoint'laridan 401 kelsa — retry qilmaymiz (cycle oldini olish)
        const url = new URL(request.url);
        if (url.pathname.includes(`/api/v1/${AUTH_PATH_PREFIX}`)) return;

        const outcome = await refreshAccessToken();
        if (!outcome.token) {
          // Faqat server sessiyani aniq rad etganda chiqaramiz
          if (outcome.definitive) useAuthStore.getState().clear();
          return;
        }

        // Yangi token bilan qayta urinish
        const retryRequest = request.clone();
        retryRequest.headers.set("Authorization", `Bearer ${outcome.token}`);
        return ky(retryRequest);
      },
    ],
  },
});

type RefreshOutcome = { token: string; definitive: false } | { token: null; definitive: boolean }; // definitive=true → server 401/403 (sessiya yo'q)

let refreshPromise: Promise<RefreshOutcome> | null = null;

/**
 * Single-flight refresh: birinchi chaqiruv so'rovni boshlaydi, qolganlari
 * o'sha promise'ni kutadi. Tugagach keyingi 401 uchun yangisi ochiladi.
 */
function refreshAccessToken(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ─── Xom fetch uchun yordamchilar (fayl yuklab olish / multipart yuklash) ───────────
//
// ky blob/multipart uchun ham ishlaydi, lekin ko'p joyda Content-Disposition fayl nomi va
// streaming kerak bo'lgani uchun xom `fetch` ishlatilgan. Ular token muddati tugaganda
// (15 daqiqa) 401 olib yiqilardi. Endi hammasi `authFetch` orqali: token qo'shiladi,
// 401 bo'lsa umumiy (single-flight) refresh kutiladi va so'rov bir marta qayta yuboriladi.

function authHeaders(base?: HeadersInit): Headers {
  const headers = new Headers(base);
  const token = useAuthStore.getState().accessToken;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept-Language", i18n.language.startsWith("ru") ? "ru" : "uz");
  return headers;
}

/**
 * Token bilan fetch. 401 → refresh → bir marta qayta urinish. Body qayta o'qiladigan
 * bo'lishi kerak (FormData, string, Blob — ha; ReadableStream — yo'q).
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = () =>
    fetch(input, { credentials: "include", ...init, headers: authHeaders(init.headers) });
  const res = await doFetch();
  if (res.status !== 401 || input.includes(`/api/v1/${AUTH_PATH_PREFIX}`)) return res;

  const outcome = await refreshAccessToken();
  if (!outcome.token) {
    if (outcome.definitive) useAuthStore.getState().clear();
    return res;
  }
  return doFetch();
}

/** Javobdan foydalanuvchiga ko'rsatiladigan xato matni (server `detail`i yoki fallback). */
export async function readErrorDetail(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.clone().json()) as { detail?: unknown };
    const detail = body.detail;
    if (typeof detail === "string" && detail) return detail;
    if (Array.isArray(detail)) {
      const parts = detail
        .map((e: unknown) =>
          e && typeof e === "object" && "msg" in e ? String((e as { msg: unknown }).msg) : "",
        )
        .filter(Boolean);
      if (parts.length) return parts.join(", ");
    }
  } catch {
    /* JSON emas */
  }
  return fallback;
}

/** Content-Disposition'dan fayl nomi (RFC 5987 `filename*=UTF-8''...` ham). */
export function filenameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const star = disposition.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* noto'g'ri kodlangan — oddiy nomga tushamiz */
    }
  }
  const plain = disposition.match(/filename\s*=\s*"?([^";]+)"?/);
  return plain?.[1]?.trim() || fallback;
}

/** Blob'ni brauzerda fayl sifatida saqlash. */
export function saveBlob(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Ba'zi brauzerlar (Safari) yuklashni boshlashdan oldin URL bekor qilinsa xato beradi
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
}

/**
 * GET → faylni yuklab olish. Xato bo'lsa server `detail`i bilan Error tashlaydi.
 * `fallbackName` — server fayl nomini bermasa.
 */
export async function downloadFile(
  url: string,
  fallbackName: string,
  errorFallback: string,
): Promise<void> {
  const res = await authFetch(url);
  if (!res.ok) throw new Error(await readErrorDetail(res, errorFallback));
  const filename = filenameFromDisposition(res.headers.get("content-disposition"), fallbackName);
  saveBlob(await res.blob(), filename);
}

async function performRefresh(): Promise<RefreshOutcome> {
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (res.status === 401 || res.status === 403) return { token: null, definitive: true };
    if (!res.ok) return { token: null, definitive: false };
    const data = (await res.json()) as { access_token?: unknown };
    if (typeof data.access_token !== "string" || !data.access_token) {
      return { token: null, definitive: false };
    }
    useAuthStore.getState().setToken(data.access_token);
    return { token: data.access_token, definitive: false };
  } catch {
    // Tarmoq xatosi / timeout — sessiya haqida hech narsa deya olmaymiz
    return { token: null, definitive: false };
  }
}

export { HTTPError };
