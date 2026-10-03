/**
 * Ilova ichidagi brauzer (Telegram, Instagram, Facebook va h.k.) aniqlash.
 *
 * Nega muhim: bunday WebView'lar alohida localStorage/cookie'ga ega (qurilma ID boshqacha →
 * "boshqa qurilma" deb bloklanadi) va GPS ruxsatini ko'pincha bermaydi. Talabaga saytni
 * Chrome/Safari'da ochish tavsiya qilinadi.
 */

export type InAppApp = "telegram" | "instagram" | "facebook" | "other";
export type MobileOS = "android" | "ios" | "other";

export type InAppBrowserInfo = {
  inApp: boolean;
  app: InAppApp | null;
  os: MobileOS;
};

type WindowWithTelegram = Window & { Telegram?: { WebApp?: unknown }; TelegramWebviewProxy?: unknown };

export function detectMobileOS(ua: string = navigator.userAgent): MobileOS {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPadOS 13+ Safari "Macintosh" deb ko'rsatadi, lekin touch bor
  if (/macintosh/i.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1) {
    return "ios";
  }
  return "other";
}

export function detectInAppBrowser(ua: string = navigator.userAgent): InAppBrowserInfo {
  const os = detectMobileOS(ua);
  const w = typeof window !== "undefined" ? (window as WindowWithTelegram) : undefined;

  let app: InAppApp | null = null;
  if (/telegram/i.test(ua) || Boolean(w?.Telegram?.WebApp) || Boolean(w?.TelegramWebviewProxy)) {
    app = "telegram";
  } else if (/instagram/i.test(ua)) {
    app = "instagram";
  } else if (/FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(ua)) {
    app = "facebook";
  } else if (/\bwv\b/.test(ua) || /; ?wv\)/.test(ua)) {
    // Android WebView ("; wv)") — Telegram shu rejimda ochadi
    app = "other";
  } else if (
    os === "ios" &&
    /AppleWebKit/i.test(ua) &&
    !/Safari\//i.test(ua) &&
    !/(CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser)\//i.test(ua)
  ) {
    // iOS WKWebView — Safari token'siz
    app = "other";
  } else if (/Line\/|KAKAOTALK|VKClient|OKApp|MicroMessenger|Snapchat|TikTok|Musical_ly/i.test(ua)) {
    app = "other";
  }

  return { inApp: app !== null, app, os };
}
