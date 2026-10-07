import { api, HTTPError } from "@/lib/api";
import { collectDeviceInfo, getDeviceId, type DeviceInfo } from "@/lib/device-id";
import { useAuthStore, type User } from "@/stores/auth";

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type LoginRequest = {
  username: string;
  password: string;
  device_id: string;
  device_info: DeviceInfo;
};

export async function login(username: string, password: string): Promise<User> {
  const body: LoginRequest = {
    username,
    password,
    device_id: getDeviceId(),
    device_info: await collectDeviceInfo(),
  };
  const tokens = await api.post("v1/auth/login", { json: body }).json<TokenResponse>();

  useAuthStore.getState().setToken(tokens.access_token);

  const user = await api.get("v1/auth/me").json<User>();
  useAuthStore.getState().setAuth(user, tokens.access_token);
  return user;
}

/**
 * Chiqish. Server javob bermasa ham (internet yo'q, sessiya allaqachon tugagan) lokal sessiya
 * tozalanadi va xato tashlanmaydi — chaqiruvchi login sahifasiga o'tishi kafolatlanadi.
 */
export async function logout(): Promise<void> {
  try {
    await api.post("v1/auth/logout");
  } catch {
    /* refresh cookie serverda muddati bilan tugaydi; lokal holat baribir tozalanadi */
  } finally {
    useAuthStore.getState().clear();
  }
}

let bootstrapPromise: Promise<void> | null = null;

async function restoreSession(): Promise<void> {
  const tokens = await api.post("v1/auth/refresh").json<TokenResponse>();
  useAuthStore.getState().setToken(tokens.access_token);
  const user = await api.get("v1/auth/me").json<User>();
  useAuthStore.getState().setAuth(user, tokens.access_token);
}

/**
 * App yuklanganda — HttpOnly refresh cookie orqali sessiyani tiklash.
 * Agar ishlasa, user ma'lumoti va access token store'ga yoziladi.
 * Aks holda — store tozalanadi (guest).
 *
 * Bir nechta komponent (RootLayout + Protected) bir vaqtda chaqirsa ham bitta
 * so'rov ketadi. Tarmoq xatosida bir marta qayta uriniladi — mobil internet
 * uzilib qolgani foydalanuvchini login sahifasiga chiqarib yubormasin.
 */
export function bootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        await restoreSession();
      } catch (err) {
        if (!(err instanceof HTTPError)) {
          await new Promise((r) => setTimeout(r, 1500));
          try {
            await restoreSession();
            return;
          } catch {
            /* quyida tozalanadi */
          }
        }
        // 423 — kirish cheklangan: `captureRestriction` rejimni allaqachon yozgan, ekran
        // ko'rsatiladi; sessiyani tozalasak ogohlantirish ham yo'qolardi
        if (err instanceof HTTPError && err.response.status === 423) {
          useAuthStore.getState().markBootstrapped();
          return;
        }
        useAuthStore.getState().clear();
      }
    })().finally(() => {
      bootstrapPromise = null;
    });
  }
  return bootstrapPromise;
}
