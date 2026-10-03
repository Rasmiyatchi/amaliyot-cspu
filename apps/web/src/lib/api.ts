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
