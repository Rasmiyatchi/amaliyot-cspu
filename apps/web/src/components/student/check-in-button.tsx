import type { TFunction } from "i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Crosshair,
  Hourglass,
  Loader2,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  MapPinOff,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { formatTashkentTime } from "@/components/attendance/attendance-date-utils";
import { describeRequestError, requestErrorKind } from "@/components/attendance/request-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { dateLocale } from "@/i18n";
import { useCheckIn, useCheckOut } from "@/lib/api/attendance";
import type { AttendanceDayDetail, CheckInRequest, UUID } from "@/lib/api/types";
import { getDeviceId } from "@/lib/device-id";
import {
  acquirePosition,
  geoErrorTexts,
  getGeoPermissionState,
  toGeoError,
  type GeoErrorCode,
  type GeoFix,
} from "@/lib/geolocation";

type Props = {
  assignmentId: UUID;
  today: AttendanceDayDetail | null | undefined;
  /**
   * Hudud (area) amaliyoti: server joylashuvni tekshirmaydi. GPS aniqlanmasa qayd baribir
   * yuboriladi va "ruxsat yo'q" xatosi ko'rsatilmaydi (koordinata bo'lsa — yuboriladi).
   */
  locationOptional?: boolean;
};

const REQUIRED_DURATION_MS = 6 * 60 * 60 * 1000; // 6 soat = 21,600,000 ms
/** Shundan yomon aniqlikda qayd yuboriladi, lekin ogohlantirish ko'rsatiladi */
const LOW_ACCURACY_M = 150;

/** Xato matni state'da saqlanmaydi — render paytida joriy tilda olinadi. */
type GeoState =
  | { phase: "idle" }
  | { phase: "acquiring"; bestAccuracy: number | null }
  | { phase: "ok"; accuracy: number }
  | { phase: "failed"; code: GeoErrorCode };

function formatDuration(ms: number, t: TFunction): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${t("common.hours")}`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes} ${t("common.minutes")}`);
  if (parts.length === 0 || (hours === 0 && minutes < 5)) {
    parts.push(`${seconds} ${t("common.seconds")}`);
  }
  return parts.join(" ");
}

function formatDigitalTimer(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function roundAccuracy(m: number): number {
  return Math.max(1, Math.round(m));
}

/* ─── Joylashuv holati paneli ─── */

type GeoStatusProps = {
  state: GeoState;
  optional: boolean;
  retrying: boolean;
  onRetry: () => void;
};

function GeoStatus({ state, optional, retrying, onRetry }: GeoStatusProps) {
  const { t } = useTranslation();

  if (state.phase === "acquiring") {
    return (
      <div
        className="flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 text-sm"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-sky-600 dark:text-sky-400" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-medium text-sky-900 dark:text-sky-200">
            {t("studentCheckInButton.acquiring")}
          </div>
          <div className="text-xs text-muted-foreground">
            {state.bestAccuracy !== null
              ? t("studentCheckInButton.currentAccuracy", { m: roundAccuracy(state.bestAccuracy) })
              : t("studentCheckInButton.waitingFirstFix")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("studentCheckInButton.acquiringTip")}
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "failed") {
    const isDenied = state.code === "denied";
    // Til almashsa ham to'g'ri matn chiqishi uchun har renderda olinadi
    const texts = geoErrorTexts(state.code);
    return (
      <Alert variant={optional ? "warning" : "destructive"} className="text-left">
        <MapPinOff className="h-4 w-4" />
        <AlertTitle>
          {isDenied
            ? t("studentCheckInButton.deniedTitle")
            : t("studentCheckInButton.geoFailedTitle")}
        </AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{optional ? t("studentCheckInButton.locationOptionalNote") : texts.message}</p>
          <p className="whitespace-pre-line text-xs leading-relaxed opacity-90">{texts.help}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={
              optional
                ? "mt-1 w-full sm:w-auto"
                : "mt-1 w-full border-destructive/40 text-destructive hover:bg-destructive/10 sm:w-auto"
            }
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            {isDenied
              ? t("studentCheckInButton.reaskPermission")
              : t("studentCheckInButton.retryLocation")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (state.phase === "ok") {
    const m = roundAccuracy(state.accuracy);
    const low = state.accuracy > LOW_ACCURACY_M;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Crosshair className="h-3.5 w-3.5" />
          <span>{t("studentCheckInButton.accuracy", { m })}</span>
        </div>
        {low && !optional && (
          <Alert variant="warning" className="text-left">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t("studentCheckInButton.lowAccuracy", { m })}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return null;
}

/* ─── Asosiy komponent ─── */

export function CheckInButton({ assignmentId, today, locationOptional = false }: Props) {
  const { t } = useTranslation();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [geo, setGeo] = useState<GeoState>({ phase: "idle" });
  const [retrying, setRetrying] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const hasCheckIn = !!today?.check_in_at;
  const hasCheckOut = !!today?.check_out_at;
  const acquiring = geo.phase === "acquiring";
  const busy = acquiring || retrying || checkIn.isPending || checkOut.isPending;

  // Ruxsat avvaldan rad etilgan bo'lsa — talaba tugma bosishdan oldin nima qilishni ko'rsin
  useEffect(() => {
    if (locationOptional) return;
    let cancelled = false;
    void getGeoPermissionState().then((state) => {
      if (cancelled || state !== "denied") return;
      setGeo((prev) => (prev.phase === "idle" ? { phase: "failed", code: "denied" } : prev));
    });
    return () => {
      cancelled = true;
    };
  }, [locationOptional]);

  // Real-time timer update
  useEffect(() => {
    if (!hasCheckIn || hasCheckOut) return;
    const tick = () => setCurrentTime(Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [hasCheckIn, hasCheckOut]);

  const timingInfo = useMemo(() => {
    if (!hasCheckIn || !today?.check_in_at) return null;
    const checkInMs = new Date(today.check_in_at).getTime();
    const unlockMs = checkInMs + REQUIRED_DURATION_MS;
    const remainingMs = Math.max(0, unlockMs - currentTime);
    const elapsedMs = Math.min(REQUIRED_DURATION_MS, Math.max(0, currentTime - checkInMs));
    const locale = dateLocale();

    return {
      checkInTimeStr: formatTashkentTime(today.check_in_at, locale),
      unlockTimeStr: formatTashkentTime(new Date(unlockMs).toISOString(), locale),
      isLocked: remainingMs > 0,
      progressPercent: Math.min(100, Math.max(0, (elapsedMs / REQUIRED_DURATION_MS) * 100)),
      digitalTimer: formatDigitalTimer(remainingMs),
      durationText: formatDuration(remainingMs, t),
    };
  }, [hasCheckIn, today?.check_in_at, currentTime, t]);

  /** Har safar yangidan so'raydi — avvalgi rad brauzer ruxsat bersa qayta prompt bo'ladi. */
  const locate = async (): Promise<GeoFix | null> => {
    setGeo({ phase: "acquiring", bestAccuracy: null });
    try {
      const fix = await acquirePosition({
        onProgress: (best) => setGeo({ phase: "acquiring", bestAccuracy: best.accuracy }),
      });
      setGeo({ phase: "ok", accuracy: fix.accuracy });
      return fix;
    } catch (err) {
      setGeo({ phase: "failed", code: toGeoError(err).code });
      return null;
    }
  };

  const handleRetryLocation = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const fix = await locate();
      if (fix) {
        toast.success(t("studentCheckInButton.locationReady", { m: roundAccuracy(fix.accuracy) }));
      }
    } finally {
      setRetrying(false);
    }
  };

  const handle = async (kind: "in" | "out") => {
    if (busy) return;
    // Internet yo'q — GPS'ni 20 s kutib o'tirmasdan darhol aytamiz
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error(t("requestError.offline"));
      return;
    }

    // GPS aniqlanmasa ham so'rov yuboriladi: hudud amaliyoti va geo-nuqtasi kiritilmagan
    // tashkilot uchun server koordinatasiz qabul qiladi; geo talab qilinsa o'zi rad etadi.
    const fix = await locate();
    const data: CheckInRequest = { device_id: getDeviceId() };
    if (fix) {
      data.lat = fix.lat;
      data.lng = fix.lng;
      data.accuracy_m = fix.accuracy;
    }

    try {
      if (kind === "in") await checkIn.mutateAsync({ assignmentId, data });
      else await checkOut.mutateAsync({ assignmentId, data });
      // Joylashuvsiz qabul qilindi — demak bu amaliyot uchun shart emas, xato panelini yopamiz
      if (!fix) setGeo({ phase: "idle" });
      toast.success(
        kind === "in"
          ? t("studentCheckInButton.checkInSuccess")
          : t("studentCheckInButton.checkOutSuccess"),
      );
    } catch (e) {
      const errorKind = requestErrorKind(e);
      const description =
        errorKind === "timeout" || errorKind === "network"
          ? t("studentCheckInButton.verifyStatusHint")
          : !fix && errorKind === "http"
            ? t("studentCheckInButton.sentWithoutLocation")
            : undefined;
      toast.error(describeRequestError(e, t), description ? { description } : undefined);
    }
  };

  const locale = dateLocale();
  const hintText = locationOptional
    ? t("studentCheckInButton.gpsHintOptional")
    : t("studentCheckInButton.gpsHint");

  // 1. Bugungi davomat yakunlangan (check-out qilingan)
  if (hasCheckOut && today?.check_in_at && today?.check_out_at) {
    const totalDurationMs =
      new Date(today.check_out_at).getTime() - new Date(today.check_in_at).getTime();

    return (
      <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 sm:h-12 sm:w-12">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                {t("studentCheckInButton.doneTodayTitle")}
              </span>
              <AttendanceStatusBadge status={today.status} />
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("studentCheckInButton.checkIn")}:
              </span>{" "}
              {formatTashkentTime(today.check_in_at, locale)} ·{" "}
              <span className="font-medium text-foreground">
                {t("studentCheckInButton.checkOut")}:
              </span>{" "}
              {formatTashkentTime(today.check_out_at, locale)}
            </div>
            <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {t("studentCheckInButton.durationSpent")}:{" "}
                <strong className="text-foreground">{formatDuration(totalDurationMs, t)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Check-in qilingan, 6 soat kutilmoqda yoki check-out qilinmagan
  if (hasCheckIn && timingInfo) {
    const isLocked = timingInfo.isLocked;

    return (
      <div className="space-y-4">
        <GeoStatus
          state={geo}
          optional={locationOptional}
          retrying={retrying}
          onRetry={handleRetryLocation}
        />

        {isLocked ? (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-300">
                <Hourglass className="h-4 w-4 shrink-0 animate-spin text-amber-600" />
                <span>{t("studentCheckInButton.lockedTitle")}</span>
              </div>
              <Badge
                variant="outline"
                className="border-amber-500/40 font-mono text-amber-800 dark:text-amber-300"
              >
                {timingInfo.digitalTimer}
              </Badge>
            </div>

            <Progress
              value={timingInfo.progressPercent}
              className="h-2 bg-amber-200/50 dark:bg-amber-950"
              aria-label={t("studentCheckInButton.lockedTitle")}
            />

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
              <div>
                <span>{t("studentCheckInButton.checkInTime")}</span>{" "}
                <strong className="text-foreground">{timingInfo.checkInTimeStr}</strong>
              </div>
              <div className="text-right">
                <span>{t("studentCheckInButton.unlocksAt")}:</span>{" "}
                <strong className="text-foreground">{timingInfo.unlockTimeStr}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                {t("studentCheckInButton.lockHint")}. {t("studentCheckInButton.remainingTime")}:{" "}
                <strong>{timingInfo.durationText}</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm">
            <Sparkles className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {t("studentCheckInButton.readyForCheckOut")}
            </div>
          </div>
        )}

        <Button
          onClick={() => void handle("out")}
          disabled={busy || isLocked}
          size="lg"
          className="h-16 w-full text-base font-semibold shadow-sm transition-all"
          variant={isLocked ? "outline" : "default"}
        >
          {busy ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-5 w-5" />
          )}
          {acquiring ? t("studentCheckInButton.acquiring") : t("studentCheckInButton.checkOut")}
          {isLocked && !acquiring && ` (${timingInfo.digitalTimer})`}
        </Button>

        <div className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {hintText}
        </div>
      </div>
    );
  }

  // 3. Kun oldindan qizil qilingan — server check-in'ni rad etadi, tugma ko'rsatilmaydi
  if (today?.status === "red") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
        <div className="min-w-0 space-y-1">
          <div className="font-medium text-rose-800 dark:text-rose-300">
            {t("studentCheckInButton.markedRedTitle")}
          </div>
          <p className="text-xs text-muted-foreground">{t("studentCheckInButton.markedRedHint")}</p>
          {today.note && <p className="text-xs italic text-muted-foreground">{today.note}</p>}
        </div>
      </div>
    );
  }

  // 4. Check-in qilinmagan (boshlang'ich holat)
  return (
    <div className="space-y-3">
      <GeoStatus
        state={geo}
        optional={locationOptional}
        retrying={retrying}
        onRetry={handleRetryLocation}
      />
      <Button
        onClick={() => void handle("in")}
        disabled={busy}
        size="lg"
        className="h-20 w-full bg-emerald-600 text-lg font-semibold text-white shadow-md transition-all hover:scale-[1.01] hover:bg-emerald-700"
      >
        {busy ? (
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        ) : (
          <LogIn className="mr-2 h-6 w-6" />
        )}
        {acquiring ? t("studentCheckInButton.acquiring") : t("studentCheckInButton.checkIn")}
      </Button>
      <div className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        {hintText}
      </div>
    </div>
  );
}
