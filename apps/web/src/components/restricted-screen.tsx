import { Loader2, LogOut, RotateCw, ShieldOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { dateLocale } from "@/i18n";
import { bootstrap, logout } from "@/lib/auth-api";
import { useAuthStore, type AccessRestriction } from "@/stores/auth";

const AUTO_RECHECK_MS = 30_000;

/**
 * Super admin shu foydalanuvchi (yoki guruhi) uchun kirishni to'xtatgan — 423 javob.
 * Rejimga qarab ikki xil ekran: "texnik ishlar" (sabab ko'rsatilmaydi) yoki
 * "kirish cheklangan" (izoh va muddat bilan). Ikkalasida ham chiqish va qayta tekshirish bor.
 */
export function RestrictedScreen({ restriction }: { restriction: AccessRestriction }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState<"retry" | "logout" | null>(null);
  const locale = dateLocale();

  // Cheklov muddati o'tgach — sessiya qayta tekshiriladi, ekran o'zi ochiladi
  const endsAtMs = restriction.ends_at ? new Date(restriction.ends_at).getTime() : null;

  const retry = async () => {
    setBusy("retry");
    try {
      useAuthStore.getState().setRestriction(null);
      // Hali ham cheklangan bo'lsa, 423 javob rejimni qayta yozadi
      await bootstrap();
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!endsAtMs || !Number.isFinite(endsAtMs)) return;
    const timer = window.setInterval(() => {
      if (Date.now() >= endsAtMs) void retry();
    }, AUTO_RECHECK_MS);
    return () => window.clearInterval(timer);
  }, [endsAtMs]);

  const handleLogout = async () => {
    setBusy("logout");
    try {
      await logout(); // store.clear() cheklovni ham tozalaydi → login sahifasi
    } finally {
      setBusy(null);
    }
  };

  const untilText =
    restriction.ends_at && Number.isFinite(endsAtMs)
      ? formatTashkentDateTime(restriction.ends_at, locale)
      : null;

  const actions = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => void retry()}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20 disabled:opacity-60"
      >
        {busy === "retry" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RotateCw className="h-4 w-4" />
        )}
        {t("restrictedScreen.retry")}
      </button>
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-white/90 disabled:opacity-60"
      >
        {busy === "logout" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {t("restrictedScreen.logout")}
      </button>
    </div>
  );

  if (restriction.mode === "maintenance") {
    return (
      <MaintenanceScreen
        message={restriction.message}
        showRescue={false}
        footer={
          <div className="space-y-4">
            {untilText && (
              <p className="text-sm text-blue-100/90">
                {t("restrictedScreen.until", { date: untilText })}
              </p>
            )}
            {actions}
          </div>
        }
      />
    );
  }

  return (
    <div
      className="rescue-bg fixed inset-0 z-[100] flex items-center justify-center overflow-hidden text-white"
      role="alert"
    >
      <div className="float-slow pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
      <div
        className="float-slow pointer-events-none absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-red-500/15 blur-3xl"
        style={{ animationDelay: "4s" }}
      />

      <div className="relative mx-4 max-w-xl text-center">
        <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center">
          <div className="pulse-ring absolute inset-0 rounded-full border-2 border-amber-300/40" />
          <div className="absolute inset-2 rounded-full bg-white/10 backdrop-blur-sm shadow-2xl" />
          <ShieldOff
            className="relative h-14 w-14 text-amber-200 drop-shadow-lg"
            aria-hidden="true"
          />
        </div>

        <h1 className="fade-up mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("restrictedScreen.title")}
        </h1>

        <p
          className="fade-up mx-auto max-w-md whitespace-pre-wrap text-base leading-relaxed text-amber-50/90"
          style={{ animationDelay: "0.2s" }}
        >
          {restriction.message || t("restrictedScreen.defaultMessage")}
        </p>

        <div
          className="fade-up mt-6 space-y-4 text-sm text-white/80"
          style={{ animationDelay: "0.4s" }}
        >
          {untilText && <p>{t("restrictedScreen.until", { date: untilText })}</p>}
          <p className="text-xs text-white/60">{t("restrictedScreen.contact")}</p>
          {actions}
          {user && (
            <p className="text-xs text-white/50">
              {t("maintenanceScreen.loggedInAs", { name: user.full_name })}
            </p>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-6 text-center text-[10px] uppercase tracking-widest text-white/40">
        {t("maintenanceScreen.universityName")}
      </div>
    </div>
  );
}
