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
 *  3. Yangi access token bilan original so'rov qayta yuboriladi
 *  4. Refresh ham 401 qaytarsa → auth store tozalanadi (foydalanuvchi login'ga yo'naltiriladi)
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
          const body = (await error.response.clone().json()) as { detail?: any };
          if (body.detail) {
            error.message =
              typeof body.detail === "string"
                ? body.detail
                : Array.isArray(body.detail)
                  ? body.detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ")
                  : JSON.stringify(body.detail);
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

        // Refresh'ga urinish
        const refreshed = await tryRefresh();
        if (!refreshed) {
          useAuthStore.getState().clear();
          return;
        }

        // Yangi token bilan qayta urinish
        const retryRequest = request.clone();
        retryRequest.headers.set("Authorization", `Bearer ${refreshed}`);
        return ky(retryRequest);
      },
    ],
  },
});

/** /auth/refresh ga urinadi. Muvaffaqiyat → yangi access token. Xato → null. */
async function tryRefresh(): Promise<string | null> {
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string };
    useAuthStore.getState().setToken(data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

export { HTTPError };
