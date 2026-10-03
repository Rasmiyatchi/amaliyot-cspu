/**
 * Geolokatsiya yordamchisi — talaba davomati (check-in/out) uchun.
 *
 * Arzon Android telefonlarda GPS birinchi fix'ni sekin va noaniq beradi.
 * Shu sababli `acquirePosition` bitta `getCurrentPosition` o'rniga
 * `watchPosition` bilan eng yaxshi fix'ni to'playdi:
 *   - aniqlik ≤ desiredAccuracyM bo'lishi bilan darhol qaytadi;
 *   - maxWaitMs tugasa — ko'rilgan eng yaxshi fix qaytadi;
 *   - umuman fix bo'lmasa — bitta past-aniqlikdagi (tarmoq) fallback so'rov;
 *   - har doim `clearWatch` qilinadi.
 *
 * Xatolar `GeoError` ko'rinishida: `code` + lokalizatsiyalangan `message` + `help`
 * (platformaga mos qadamlar: Android Chrome / iOS Safari / desktop).
 */
import i18n from "@/i18n";

export type GeoPermissionState = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

export type GeoFix = {
  lat: number;
  lng: number;
  /** metrda (95% radius) */
  accuracy: number;
  timestamp: number;
};

export type GeoErrorCode = "denied" | "unavailable" | "timeout" | "unsupported" | "insecure";

export class GeoError extends Error {
  readonly code: GeoErrorCode;
  /** Foydalanuvchi nima qilishi kerakligi — qadamlar, \n bilan ajratilgan */
  readonly help: string;

  constructor(code: GeoErrorCode) {
    const texts = geoErrorTexts(code);
    super(texts.message);
    this.name = "GeoError";
    this.code = code;
    this.help = texts.help;
  }
}

export type AcquireOptions = {
  /** Shu aniqlikka yetganda kutmay qaytadi (default 60 m) */
  desiredAccuracyM?: number;
  /** Maksimal kutish (default 20 000 ms) */
  maxWaitMs?: number;
  /** Har yangi eng yaxshi fix'da chaqiriladi — UI "hozirgi aniqlik"ni ko'rsatadi */
  onProgress?: (best: GeoFix) => void;
};

export type GeoPlatform = "android" | "ios" | "other";

export function detectGeoPlatform(): GeoPlatform {
  try {
    const ua = navigator.userAgent ?? "";
    if (/Android/i.test(ua)) return "android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    // iPadOS "desktop" rejimi: Macintosh + sensorli ekran
    if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return "ios";
    return "other";
  } catch {
    return "other";
  }
}

/** Platformaga mos "ruxsat qanday beriladi" qadamlari. */
export function geoPermissionHelp(platform: GeoPlatform = detectGeoPlatform()): string {
  switch (platform) {
    case "android":
      return i18n.t("geo.help.android", {
        defaultValue:
          "Chrome: manzil satridagi qulf belgisini bosing → Ruxsatlar → Joylashuv → Ruxsat berish.\nTelefon Sozlamalari → Joylashuv (GPS) yoqilgan bo'lishi shart.\nSo'ng «Ruxsatni qayta so'rash» tugmasini bosing yoki sahifani yangilang.",
      });
    case "ios":
      return i18n.t("geo.help.ios", {
        defaultValue:
          "iPhone: Sozlamalar → Maxfiylik va xavfsizlik → Joylashuv xizmatlari → Safari veb-saytlari → «Foydalanish vaqtida».\nSafari'da manzil satridagi «aA» → Veb-sayt sozlamalari → Joylashuv → Ruxsat berish.\nSo'ng sahifani yangilang.",
      });
    default:
      return i18n.t("geo.help.desktop", {
        defaultValue:
          "Brauzer manzil satridagi qulf belgisini bosing → Sayt sozlamalari → Joylashuv → Ruxsat berish, so'ng sahifani yangilang.",
      });
  }
}

export function geoErrorTexts(code: GeoErrorCode): { message: string; help: string } {
  switch (code) {
    case "denied":
      return {
        message: i18n.t("geo.error.denied", {
          defaultValue: "Joylashuvga ruxsat berilmagan. Davomat uchun joylashuv shart.",
        }),
        help: geoPermissionHelp(),
      };
    case "unavailable":
      return {
        message: i18n.t("geo.error.unavailable", {
          defaultValue: "Qurilma joylashuvni aniqlay olmadi.",
        }),
        help: i18n.t("geo.help.unavailable", {
          defaultValue:
            "Telefon sozlamalarida Joylashuv (GPS) yoqilganini tekshiring.\nOchiq joyga chiqing, Wi-Fi va mobil internetni yoqing, so'ng qayta urinib ko'ring.",
        }),
      };
    case "timeout":
      return {
        message: i18n.t("geo.error.timeout", {
          defaultValue: "Joylashuv belgilangan vaqtda aniqlanmadi.",
        }),
        help: i18n.t("geo.help.timeout", {
          defaultValue:
            "Bino ichida GPS signal zaif bo'ladi — deraza yoniga yoki hovliga chiqing.\nWi-Fi yoqilgan bo'lsa joylashuv tezroq aniqlanadi. Keyin qayta urinib ko'ring.",
        }),
      };
    case "insecure":
      return {
        message: i18n.t("geo.error.insecure", {
          defaultValue: "Sayt xavfsiz ulanish (https) orqali ochilmagan — joylashuv ishlamaydi.",
        }),
        help: i18n.t("geo.help.insecure", {
          defaultValue: "Manzilni https:// bilan boshlanadigan ko'rinishda qayta oching.",
        }),
      };
    case "unsupported":
    default:
      return {
        message: i18n.t("geo.error.unsupported", {
          defaultValue: "Brauzeringiz joylashuvni qo'llamaydi.",
        }),
        help: i18n.t("geo.help.unsupported", {
          defaultValue: "Chrome yoki Safari'ning yangi versiyasidan foydalaning.",
        }),
      };
  }
}

export async function getGeoPermissionState(): Promise<GeoPermissionState> {
  try {
    if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
    if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
      return "unknown";
    }
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") {
      return status.state;
    }
    return "unknown";
  } catch {
    // Safari eski versiyalari "geolocation" nomini qo'llamaydi
    return "unknown";
  }
}

function toFix(pos: GeolocationPosition): GeoFix {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : 9999,
    timestamp: pos.timestamp,
  };
}

function codeFromPositionError(err: GeolocationPositionError): GeoErrorCode {
  switch (err.code) {
    case 1: // PERMISSION_DENIED
      return "denied";
    case 2: // POSITION_UNAVAILABLE
      return "unavailable";
    case 3: // TIMEOUT
    default:
      return "timeout";
  }
}

/** Bitta past-aniqlikdagi (Wi-Fi/tarmoq, 60 s keshga rozi) so'rov — oxirgi urinish. */
function fallbackPosition(): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toFix(pos)),
      (err) => reject(new GeoError(codeFromPositionError(err))),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  });
}

export function acquirePosition(opts: AcquireOptions = {}): Promise<GeoFix> {
  const desired = opts.desiredAccuracyM ?? 60;
  const maxWait = opts.maxWaitMs ?? 20_000;

  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return Promise.reject(new GeoError("insecure"));
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new GeoError("unsupported"));
  }

  return new Promise<GeoFix>((resolve, reject) => {
    let best: GeoFix | null = null;
    let settled = false;
    let watchId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // ignore
        }
      }
      watchId = null;
    };

    const finish = (run: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      run();
    };

    const onPosition = (pos: GeolocationPosition) => {
      if (settled) return;
      const fix = toFix(pos);
      if (!best || fix.accuracy < best.accuracy) {
        best = fix;
        try {
          opts.onProgress?.(fix);
        } catch {
          // UI callback xatosi aniqlashni to'xtatmasin
        }
      }
      if (fix.accuracy <= desired) finish(() => resolve(fix));
    };

    const onError = (err: GeolocationPositionError) => {
      if (settled) return;
      // Ruxsat rad etilgan — kutishdan ma'no yo'q
      if (err.code === 1) finish(() => reject(new GeoError("denied")));
      // POSITION_UNAVAILABLE / TIMEOUT: watch davom etadi, deadline'da hal qilinadi
    };

    const onDeadline = () => {
      if (settled) return;
      const snapshot = best;
      if (snapshot) {
        finish(() => resolve(snapshot));
        return;
      }
      finish(() => {
        fallbackPosition().then(resolve, reject);
      });
    };

    try {
      watchId = navigator.geolocation.watchPosition(onPosition, onError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: maxWait,
      });
    } catch {
      finish(() => reject(new GeoError("unavailable")));
      return;
    }
    timer = setTimeout(onDeadline, maxWait);
  });
}

/** Noma'lum xatoni GeoError'ga keltiradi (UI uchun). */
export function toGeoError(err: unknown): GeoError {
  if (err instanceof GeoError) return err;
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "number"
  ) {
    return new GeoError(codeFromPositionError(err as GeolocationPositionError));
  }
  return new GeoError("unavailable");
}
