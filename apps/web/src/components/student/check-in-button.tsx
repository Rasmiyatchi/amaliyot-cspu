import { HTTPError } from "ky";
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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
  disabled?: boolean;
};

const REQUIRED_DURATION_MS = 6 * 60 * 60 * 1000; // 6 soat = 21,600,000 ms
/** Shundan yomon aniqlikda qayd yuboriladi, lekin ogohlantirish ko'rsatiladi */
const LOW_ACCURACY_M = 150;

type GeoState =
  | { phase: "idle" }
  | { phase: "acquiring"; bestAccuracy: number | null }
  | { phase: "ok"; accuracy: number }
  | { phase: "failed"; code: GeoErrorCode; message: string; help: string };

function formatDuration(
  ms: number,
  t?: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hStr = t ? t("common.hours", { defaultValue: "soat" }) : "soat";
  const mStr = t ? t("common.minutes", { defaultValue: "daqiqa" }) : "daqiqa";
  const sStr = t ? t("common.seconds", { defaultValue: "soniya" }) : "soniya";

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hStr}`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes} ${mStr}`);
  if (parts.length === 0 || (hours === 0 && minutes < 5)) {
    parts.push(`${seconds} ${sStr}`);
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
  retrying: boolean;
  onRetry: () => void;
};

function GeoStatus({ state, retrying, onRetry }: GeoStatusProps) {
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
            {t("studentCheckInButton.acquiring", { defaultValue: "Joylashuv aniqlanmoqda…" })}
          </div>
          <div className="text-xs text-muted-foreground">
            {state.bestAccuracy !== null
              ? t("studentCheckInButton.currentAccuracy", {
                  defaultValue: "Hozirgi aniqlik: ±{{m}} m",
                  m: roundAccuracy(state.bestAccuracy),
                })
              : t("studentCheckInButton.waitingFirstFix", {
                  defaultValue: "GPS signal kutilmoqda…",
                })}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("studentCheckInButton.acquiringTip", {
              defaultValue:
                "Ochiq joyda turing, telefonda GPS va Wi-Fi yoqilgan bo'lsin. 20 soniyagacha davom etishi mumkin.",
            })}
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "failed") {
    const isDenied = state.code === "denied";
    return (
      <Alert variant="destructive" className="text-left">
        <MapPinOff className="h-4 w-4" />
        <AlertTitle>
          {isDenied
            ? t("studentCheckInButton.deniedTitle", {
                defaultValue: "Joylashuvga ruxsat yo'q",
              })
            : t("studentCheckInButton.geoFailedTitle", {
                defaultValue: "Joylashuv aniqlanmadi",
              })}
        </AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{state.message}</p>
          <p className="whitespace-pre-line text-xs leading-relaxed opacity-90">{state.help}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-1 w-full border-destructive/40 text-destructive hover:bg-destructive/10 sm:w-auto"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            {isDenied
              ? t("studentCheckInButton.reaskPermission", {
                  defaultValue: "Ruxsatni qayta so'rash",
                })
              : t("studentCheckInButton.retryLocation", { defaultValue: "Qayta aniqlash" })}
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
          <span>
            {t("studentCheckInButton.accuracy", { defaultValue: "Aniqlik: ±{{m}} m", m })}
          </span>
        </div>
        {low && (
          <Alert variant="warning" className="text-left">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t("studentCheckInButton.lowAccuracy", {
                defaultValue:
                  "Aniqlik past (±{{m}} m) — hudud tekshiruvi xato bo'lishi mumkin. Ochiq joyga chiqib, GPS yoqilganini tekshiring.",
                m,
              })}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return null;
}

/* ─── Asosiy komponent ─── */

export function CheckInButton({ assignmentId, today, disabled }: Props) {
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
    let cancelled = false;
    void getGeoPermissionState().then((state) => {
      if (cancelled || state !== "denied") return;
      const texts = geoErrorTexts("denied");
      setGeo({ phase: "failed", code: "denied", ...texts });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time timer update
  useEffect(() => {
    if (!hasCheckIn || hasCheckOut) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [hasCheckIn, hasCheckOut]);

  const timingInfo = useMemo(() => {
    if (!hasCheckIn || !today?.check_in_at) return null;
    const checkInMs = new Date(today.check_in_at).getTime();
    const unlockMs = checkInMs + REQUIRED_DURATION_MS;
    const remainingMs = Math.max(0, unlockMs - currentTime);
    const elapsedMs = Math.min(REQUIRED_DURATION_MS, Math.max(0, currentTime - checkInMs));
    const isLocked = remainingMs > 0;
    const progressPercent = Math.min(
      100,
      Math.max(0, (elapsedMs / REQUIRED_DURATION_MS) * 100),
    );

    return {
      checkInTimeStr: new Date(today.check_in_at).toLocaleTimeString(dateLocale(), {
        hour: "2-digit",
        minute: "2-digit",
      }),
      unlockTimeStr: new Date(unlockMs).toLocaleTimeString(dateLocale(), {
        hour: "2-digit",
        minute: "2-digit",
      }),
      remainingMs,
      isLocked,
      progressPercent,
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
      const geoErr = toGeoError(err);
      setGeo({ phase: "failed", code: geoErr.code, message: geoErr.message, help: geoErr.help });
      toast.error(geoErr.message);
      return null;
    }
  };

  const handleRetryLocation = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const fix = await locate();
      if (fix) {
        toast.success(
          t("studentCheckInButton.locationReady", {
            defaultValue: "Joylashuv aniqlandi (±{{m}} m). Endi tugmani bosing.",
            m: roundAccuracy(fix.accuracy),
          }),
        );
      }
    } finally {
      setRetrying(false);
    }
  };

  const handle = async (kind: "in" | "out") => {
    const fix = await locate();
    if (!fix) return;

    const data: CheckInRequest = {
      lat: fix.lat,
      lng: fix.lng,
      accuracy_m: fix.accuracy,
      device_id: getDeviceId(),
    };
    try {
      if (kind === "in") {
        await checkIn.mutateAsync({ assignmentId, data });
        toast.success(t("studentCheckInButton.checkInSuccess"));
      } else {
        await checkOut.mutateAsync({ assignmentId, data });
        toast.success(t("studentCheckInButton.checkOutSuccess"));
      }
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  if (disabled) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {t("studentCheckInButton.noActivePractice")}
      </div>
    );
  }

  // 1. Bugungi davomat yakunlangan (check-out qilingan)
  if (hasCheckOut && today?.check_in_at && today?.check_out_at) {
    const checkInDate = new Date(today.check_in_at);
    const checkOutDate = new Date(today.check_out_at);
    const totalDurationMs = checkOutDate.getTime() - checkInDate.getTime();

    return (
      <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                {t("studentCheckInButton.doneToday")}
              </span>
              <Badge variant="success" className="px-2 py-0.5 text-xs">
                {t("attendanceAttendanceStatusBadge.status.green", { defaultValue: "Yashil" })}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("studentCheckInButton.checkIn")}:
              </span>{" "}
              {checkInDate.toLocaleTimeString(dateLocale(), {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              ·{" "}
              <span className="font-medium text-foreground">
                {t("studentCheckInButton.checkOut")}:
              </span>{" "}
              {checkOutDate.toLocaleTimeString(dateLocale(), {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
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
        <GeoStatus state={geo} retrying={retrying} onRetry={handleRetryLocation} />

        {isLocked ? (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-300">
                <Hourglass className="h-4 w-4 animate-spin text-amber-600" />
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
            />

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
              <div>
                <span className="text-muted-foreground">
                  {t("studentCheckInButton.checkInTime", { defaultValue: "Kelgan vaqt:" })}
                </span>{" "}
                <strong className="text-foreground">{timingInfo.checkInTimeStr}</strong>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">
                  {t("studentCheckInButton.unlocksAt")}:
                </span>{" "}
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
          {acquiring
            ? t("studentCheckInButton.acquiring", { defaultValue: "Joylashuv aniqlanmoqda…" })
            : t("studentCheckInButton.checkOut")}
          {isLocked && !acquiring && ` (${timingInfo.digitalTimer})`}
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {t("studentCheckInButton.gpsHint")}
        </div>
      </div>
    );
  }

  // 3. Check-in qilinmagan (boshlang'ich holat)
  return (
    <div className="space-y-3">
      <GeoStatus state={geo} retrying={retrying} onRetry={handleRetryLocation} />
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
        {acquiring
          ? t("studentCheckInButton.acquiring", { defaultValue: "Joylashuv aniqlanmoqda…" })
          : t("studentCheckInButton.checkIn")}
      </Button>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {t("studentCheckInButton.gpsHint")}
      </div>
    </div>
  );
}
