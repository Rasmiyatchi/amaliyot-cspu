import { AlertTriangle, Check, Copy, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { detectInAppBrowser } from "@/lib/in-app-browser";

const DISMISS_KEY = "chdpu_inapp_warning_dismissed_at";
const DISMISS_TTL_MS = 6 * 60 * 60 * 1000; // 6 soat — har kuni yana eslatadi

function readDismissed(): boolean {
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Telegram/Instagram ichidagi brauzerdan ochilganda ko'rinadigan ogohlantirish.
 * Oddiy brauzerda hech narsa render qilmaydi.
 */
export function InAppBrowserWarning() {
  const { t } = useTranslation();
  const info = useMemo(() => detectInAppBrowser(), []);
  const [dismissed, setDismissed] = useState(() => readDismissed());
  const [copied, setCopied] = useState(false);

  if (!info.inApp || dismissed) return null;

  const appName =
    info.app === "telegram"
      ? "Telegram"
      : info.app === "instagram"
        ? "Instagram"
        : info.app === "facebook"
          ? "Facebook"
          : t("inAppBrowser.genericApp");

  const steps =
    info.os === "ios"
      ? t("inAppBrowser.stepsIos")
      : info.os === "android"
        ? t("inAppBrowser.stepsAndroid")
        : t("inAppBrowser.stepsGeneric");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard mavjud emas — havola matnini ko'rsatamiz */
      window.prompt(t("inAppBrowser.copyFallback"), window.location.href);
    }
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div
      role="alert"
      className="relative z-50 border-b border-amber-500/40 bg-amber-50 px-4 py-3 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 space-y-1.5 text-sm">
          <div className="font-semibold">{t("inAppBrowser.title", { app: appName })}</div>
          <p className="leading-relaxed">{t("inAppBrowser.body")}</p>
          <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">{steps}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-8 bg-background" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("inAppBrowser.copied") : t("inAppBrowser.copyLink")}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("common.close")}
          className="shrink-0 rounded-md p-1 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
