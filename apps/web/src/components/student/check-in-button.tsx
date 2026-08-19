import { HTTPError } from "ky";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hourglass,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import i18n, { dateLocale } from "@/i18n";
import { useCheckIn, useCheckOut } from "@/lib/api/attendance";
import type { AttendanceDayDetail, UUID } from "@/lib/api/types";

type Props = {
  assignmentId: UUID;
  today: AttendanceDayDetail | null | undefined;
  disabled?: boolean;
};

const REQUIRED_DURATION_MS = 6 * 60 * 60 * 1000; // 6 soat = 21,600,000 ms

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error(i18n.t("studentCheckInButton.gpsUnavailable")));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} soat`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes} daqiqa`);
  if (parts.length === 0 || (hours === 0 && minutes < 5)) {
    parts.push(`${seconds} soniya`);
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

export function CheckInButton({ assignmentId, today, disabled }: Props) {
  const { t } = useTranslation();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const hasCheckIn = !!today?.check_in_at;
  const hasCheckOut = !!today?.check_out_at;
  const busy = checkIn.isPending || checkOut.isPending;

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
    const elapsedMs = Math.min(
      REQUIRED_DURATION_MS,
      Math.max(0, currentTime - checkInMs)
    );
    const isLocked = remainingMs > 0;
    const progressPercent = Math.min(
      100,
      Math.max(0, (elapsedMs / REQUIRED_DURATION_MS) * 100)
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
      durationText: formatDuration(remainingMs),
    };
  }, [hasCheckIn, today?.check_in_at, currentTime]);

  const handle = async (kind: "in" | "out") => {
    setGpsError(null);
    try {
      const pos = await getPosition();
      const data = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
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
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("studentCheckInButton.gpsFailed");
      setGpsError(msg);
      toast.error(msg);
    }
  };

  if (disabled) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {t("studentCheckInButton.noActivePractice")}
      </div>
    );
  }

  // 1. Agar bugungi davomat yakunlangan bo'lsa (Check-out qilingan)
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
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                {t("studentCheckInButton.doneToday")}
              </span>
              <Badge variant="success" className="px-2 py-0.5 text-xs">
                Yashil
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
            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                {t("studentCheckInButton.durationSpent")}:{" "}
                <strong className="text-foreground">
                  {formatDuration(totalDurationMs)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Agar talaba check-in qilgan, lekin hali 6 soat to'lmagan yoki check-out qilinmagan bo'lsa
  if (hasCheckIn && timingInfo) {
    const isLocked = timingInfo.isLocked;

    return (
      <div className="space-y-4">
        {gpsError && (
          <Alert variant="destructive">
            <AlertDescription>{gpsError}</AlertDescription>
          </Alert>
        )}

        {isLocked ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-300">
                <Hourglass className="h-4 w-4 animate-spin text-amber-600" />
                <span>{t("studentCheckInButton.lockedTitle")}</span>
              </div>
              <Badge variant="outline" className="border-amber-500/40 text-amber-800 dark:text-amber-300 font-mono">
                {timingInfo.digitalTimer}
              </Badge>
            </div>

            <Progress
              value={timingInfo.progressPercent}
              className="h-2 bg-amber-200/50 dark:bg-amber-950"
            />

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
              <div>
                <span className="text-muted-foreground">Kelgan vaqt:</span>{" "}
                <strong className="text-foreground">{timingInfo.checkInTimeStr}</strong>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">{t("studentCheckInButton.unlocksAt")}:</span>{" "}
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
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {t("studentCheckInButton.readyForCheckOut")}
            </div>
          </div>
        )}

        <Button
          onClick={() => handle("out")}
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
          {t("studentCheckInButton.checkOut")}
          {isLocked && ` (${timingInfo.digitalTimer})`}
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
      {gpsError && (
        <Alert variant="destructive">
          <AlertDescription>{gpsError}</AlertDescription>
        </Alert>
      )}
      <Button
        onClick={() => handle("in")}
        disabled={busy}
        size="lg"
        className="h-20 w-full text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all hover:scale-[1.01]"
      >
        {busy ? (
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        ) : (
          <LogIn className="mr-2 h-6 w-6" />
        )}
        {t("studentCheckInButton.checkIn")}
      </Button>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {t("studentCheckInButton.gpsHint")}
      </div>
    </div>
  );
}
