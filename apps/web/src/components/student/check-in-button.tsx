import { HTTPError } from "ky";
import { CheckCircle2, Loader2, LogIn, LogOut, MapPin } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import i18n, { dateLocale } from "@/i18n";
import { useCheckIn, useCheckOut } from "@/lib/api/attendance";
import type { AttendanceDayDetail, UUID } from "@/lib/api/types";

type Props = {
  assignmentId: UUID;
  today: AttendanceDayDetail | null | undefined;
  disabled?: boolean;
};

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

export function CheckInButton({ assignmentId, today, disabled }: Props) {
  const { t } = useTranslation();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [gpsError, setGpsError] = useState<string | null>(null);

  const hasCheckIn = !!today?.check_in_at;
  const hasCheckOut = !!today?.check_out_at;
  const busy = checkIn.isPending || checkOut.isPending;

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

  if (hasCheckOut) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <div>
            <div className="font-semibold">{t("studentCheckInButton.doneToday")}</div>
            <div className="text-sm text-muted-foreground">
              {t("studentCheckInButton.checkIn")}: {today && new Date(today.check_in_at!).toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })}
              {" · "}
              {t("studentCheckInButton.checkOut")}: {today && new Date(today.check_out_at!).toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {gpsError && (
        <Alert variant="destructive">
          <AlertDescription>{gpsError}</AlertDescription>
        </Alert>
      )}
      <Button
        onClick={() => handle(hasCheckIn ? "out" : "in")}
        disabled={busy}
        size="lg"
        className="h-20 w-full text-lg"
        variant={hasCheckIn ? "outline" : "default"}
      >
        {busy ? (
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        ) : hasCheckIn ? (
          <LogOut className="mr-2 h-6 w-6" />
        ) : (
          <LogIn className="mr-2 h-6 w-6" />
        )}
        {hasCheckIn
          ? t("studentCheckInButton.checkOut")
          : t("studentCheckInButton.checkIn")}
      </Button>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        {t("studentCheckInButton.gpsHint")}
      </div>
    </div>
  );
}
