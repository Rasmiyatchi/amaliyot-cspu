/**
 * Qurilma identifikatori (fingerprint) — bitta-qurilma login uchun.
 * Birinchi marta yaratiladi va localStorage'da saqlanadi. Brauzer/qurilma
 * almashtirilsa yangi ID hosil bo'ladi (bu — "boshqa qurilma" deb hisoblanadi).
 */
const STORAGE_KEY = "chdpu_device_id";

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage mavjud emas (incognito/eski brauzer) — sessiyaga xos ID
    return `ephemeral-${Math.random().toString(36).slice(2)}`;
  }
}
