/**
 * Qurilma identifikatori (fingerprint) — bitta-qurilma login uchun.
 * Birinchi marta yaratiladi va localStorage + cookie'da (365 kun) saqlanadi.
 * Brauzer/qurilma almashtirilsa yangi ID hosil bo'ladi (bu — "boshqa qurilma").
 *
 * Qo'shimcha: `collectDeviceInfo()` — login paytida backend'ga yuboriladigan,
 * admin uchun o'qiladigan qurilma tavsifi (platforma, model, brauzer, ekran...).
 */
const STORAGE_KEY = "chdpu_device_id";
const COOKIE_NAME = "chdpu_device_id";

export type DeviceInfo = {
  platform: string | null; // "Android" | "iOS" | "Windows" | "macOS" | "Linux" | null
  platform_version: string | null;
  model: string | null; // userAgentData model (Android) yoki "iPhone"/"iPad"
  brand: string | null; // userAgentData brands → asosiy brauzer brendi
  browser: string | null;
  browser_version: string | null;
  screen: string | null; // `${width}x${height}@${dpr}`
  timezone: string | null;
  language: string | null;
  touch: boolean;
  user_agent: string;
};

/* ─── User-Agent Client Hints (TS lib'da yo'q — minimal tiplar) ─── */
type UADataBrand = { brand: string; version: string };
type UADataValues = {
  platform?: string;
  platformVersion?: string;
  model?: string;
  brands?: UADataBrand[];
  mobile?: boolean;
};
type NavigatorUAData = {
  brands?: UADataBrand[];
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<UADataValues>;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapeRegExp(name)}=([^;]*)`));
    return match && match[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days = 365) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = getCookie(COOKIE_NAME);
    }
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    localStorage.setItem(STORAGE_KEY, id);
    setCookie(COOKIE_NAME, id);
    return id;
  } catch {
    const cookieId = getCookie(COOKIE_NAME);
    if (cookieId) return cookieId;
    return `ephemeral-${Math.random().toString(36).slice(2)}`;
  }
}

/* ─── UA parsing ─── */

type ParsedPlatform = { platform: string | null; version: string | null; model: string | null };

function parsePlatform(ua: string, touchPoints: number): ParsedPlatform {
  const android = ua.match(/Android\s+([\d.]+)/i);
  if (android || /Android/i.test(ua)) {
    // "...; SM-A546E Build/..." yoki "...; SM-A546E)"
    const model = ua.match(/Android[^;)]*;\s*([^;)]+?)(?:\s+Build|\))/i);
    return {
      platform: "Android",
      version: android?.[1] ?? null,
      model: model?.[1]?.trim() || null,
    };
  }
  const ios = ua.match(/(iPhone|iPad|iPod)/i);
  if (ios) {
    const v = ua.match(/OS\s+(\d+)[_.](\d+)(?:[_.](\d+))?/i);
    const version = v ? [v[1], v[2], v[3]].filter(Boolean).join(".") : null;
    const kind = (ios[1] ?? "iphone").toLowerCase();
    const model = kind === "ipod" ? "iPod" : kind === "ipad" ? "iPad" : "iPhone";
    return { platform: "iOS", version, model };
  }
  if (/Windows NT\s+([\d.]+)/i.test(ua)) {
    const nt = ua.match(/Windows NT\s+([\d.]+)/i)?.[1] ?? null;
    const human =
      nt === "10.0" ? "10" : nt === "6.3" ? "8.1" : nt === "6.2" ? "8" : nt === "6.1" ? "7" : nt;
    return { platform: "Windows", version: human, model: null };
  }
  if (/Macintosh|Mac OS X/i.test(ua)) {
    // iPadOS Safari "desktop" rejimida Macintosh deb ko'rinadi, lekin sensorli
    if (touchPoints > 1) return { platform: "iOS", version: null, model: "iPad" };
    const v = ua.match(/Mac OS X\s+(\d+)[_.](\d+)(?:[_.](\d+))?/i);
    const version = v ? [v[1], v[2], v[3]].filter(Boolean).join(".") : null;
    return { platform: "macOS", version, model: null };
  }
  if (/CrOS/i.test(ua)) return { platform: "ChromeOS", version: null, model: null };
  if (/Linux|X11/i.test(ua)) return { platform: "Linux", version: null, model: null };
  return { platform: null, version: null, model: null };
}

type ParsedBrowser = { browser: string | null; version: string | null };

/** Tartib muhim: Edge/Opera/Samsung/Yandex Chrome tokenini ham o'z ichiga oladi. */
const BROWSER_PATTERNS: Array<[string, RegExp]> = [
  ["Edge", /(?:Edg|EdgA|EdgiOS)\/([\d.]+)/],
  ["Opera", /(?:OPR|Opera)\/([\d.]+)/],
  ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
  ["Yandex", /YaBrowser\/([\d.]+)/],
  ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
  ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
  ["Safari", /Version\/([\d.]+).*Safari\//],
];

function parseBrowser(ua: string): ParsedBrowser {
  for (const [name, re] of BROWSER_PATTERNS) {
    const m = ua.match(re);
    if (m) return { browser: name, version: m[1] ?? null };
  }
  return { browser: null, version: null };
}

function majorVersion(v: string | null): string | null {
  if (!v) return null;
  const major = v.split(".")[0];
  return major || null;
}

function primaryBrand(brands: UADataBrand[] | undefined): string | null {
  if (!brands?.length) return null;
  const meaningful = brands.filter(
    (b) => !/not.?a.?brand/i.test(b.brand) && !/^chromium$/i.test(b.brand.trim()),
  );
  const pick = meaningful[0] ?? brands[0];
  return pick?.brand?.trim() || null;
}

function safeScreen(): string | null {
  try {
    const w = window.screen?.width;
    const h = window.screen?.height;
    if (!w || !h) return null;
    const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
    return `${w}x${h}@${dpr}`;
  } catch {
    return null;
  }
}

function safeTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

function safeTouch(): boolean {
  try {
    return (navigator.maxTouchPoints ?? 0) > 0 || "ontouchstart" in window;
  } catch {
    return false;
  }
}

/**
 * Qurilma tavsifini yig'adi. Hech qachon throw qilmaydi — har bir maydon
 * alohida himoyalangan; eng yomon holatda ham `user_agent` qaytadi.
 */
export async function collectDeviceInfo(): Promise<DeviceInfo> {
  const ua = (() => {
    try {
      return navigator.userAgent ?? "";
    } catch {
      return "";
    }
  })();

  const info: DeviceInfo = {
    platform: null,
    platform_version: null,
    model: null,
    brand: null,
    browser: null,
    browser_version: null,
    screen: null,
    timezone: null,
    language: null,
    touch: false,
    user_agent: ua,
  };

  try {
    let touchPoints = 0;
    try {
      touchPoints = navigator.maxTouchPoints ?? 0;
    } catch {
      touchPoints = 0;
    }
    const p = parsePlatform(ua, touchPoints);
    info.platform = p.platform;
    info.platform_version = p.version;
    info.model = p.model;

    const b = parseBrowser(ua);
    info.browser = b.browser;
    info.browser_version = majorVersion(b.version);

    info.screen = safeScreen();
    info.timezone = safeTimezone();
    info.touch = safeTouch();
    try {
      info.language = navigator.language ?? null;
    } catch {
      info.language = null;
    }
  } catch {
    // UA parsing xatosi — asosiy maydonlar null qoladi
  }

  // Client Hints (Chromium): aniqroq platforma versiyasi va Android modeli
  try {
    const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
    if (uaData) {
      info.brand = primaryBrand(uaData.brands) ?? info.brand;
      if (typeof uaData.getHighEntropyValues === "function") {
        const hi = await uaData.getHighEntropyValues(["platform", "platformVersion", "model"]);
        if (hi.platform && !info.platform) info.platform = hi.platform;
        if (hi.platformVersion) {
          // Windows uchun platformVersion "13.0.0"+ = Windows 11
          if (info.platform === "Windows") {
            const major = Number(hi.platformVersion.split(".")[0]);
            if (Number.isFinite(major) && major >= 13) info.platform_version = "11";
          } else {
            info.platform_version = majorVersion(hi.platformVersion) ?? info.platform_version;
          }
        }
        if (hi.model && hi.model.trim()) info.model = hi.model.trim();
        info.brand = primaryBrand(hi.brands) ?? info.brand;
      }
    }
  } catch {
    // Client Hints yo'q yoki rad etildi — UA natijasi qoladi
  }

  if (!info.brand && info.browser) info.brand = info.browser;
  return info;
}
