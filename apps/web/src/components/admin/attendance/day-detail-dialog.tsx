import { HTTPError } from "ky";
import {
  CalendarDays,
  CheckCircle2,
  History,
  Loader2,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { dateLocale } from "@/i18n";
import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { OverrideDialog } from "@/components/admin/attendance/override-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  useApproveDay,
  useAttendanceDay,
  useAttendanceOverrides,
  useRejectDay,
} from "@/lib/api/attendance";
import type { AttendanceDay } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

type Props = {
  day: AttendanceDay | null;
  onClose: () => void;
};

const fmtDateTime = (s: string | null) =>
  s ? new Date(s).toLocaleString(dateLocale()) : "—";

const fmtNum = (v: string | number | null): string => {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n.toFixed(6) : "—";
};

export function DayDetailDialog({ day, onClose }: Props) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === "super_admin";

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: detail, isPending } = useAttendanceDay(day?.id ?? null);
  const { data: overrides } = useAttendanceOverrides(day?.id ?? null);

  const approve = useApproveDay();
  const reject = useRejectDay();

  if (!day) return null;

  const handleApprove = async () => {
    try {
      await approve.mutateAsync({ id: day.id, data: {} });
      toast.success(t("attendanceDayDetailDialog.approvedGreenToast"));
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 3) {
      toast.error(t("attendanceDayDetailDialog.reasonRequired"));
      return;
    }
    try {
      await reject.mutateAsync({ id: day.id, data: { note: rejectReason.trim() } });
      toast.success(t("attendanceDayDetailDialog.markedRedToast"));
      setRejectMode(false);
      setRejectReason("");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  return (
    <>
      <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div>{day.student_full_name ?? "—"}</div>
                <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                  {day.date} · {day.organization_name ?? day.area_name ?? "—"}
                </div>
              </div>
              <AttendanceStatusBadge status={day.status} />
            </DialogTitle>
            <DialogDescription>ID: {day.student_hemis_id ?? "—"}</DialogDescription>
          </DialogHeader>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {isSuperAdmin && day.status === "pending" && (
              <>
                <Button onClick={handleApprove} disabled={approve.isPending}>
                  {approve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <CheckCircle2 className="h-4 w-4" />
                  {t("attendanceDayDetailDialog.approveGreen")}
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setRejectMode(!rejectMode)}
                >
                  <XCircle className="h-4 w-4" />
                  {t("common.reject")}
                </Button>
              </>
            )}
            {isSuperAdmin && (
              <Button variant="outline" onClick={() => setOverrideOpen(true)}>
                <ShieldCheck className="h-4 w-4" />
                Override
              </Button>
            )}
          </div>

          {rejectMode && (
            <Alert>
              <AlertDescription className="space-y-2">
                <div className="text-sm font-medium">{t("attendanceDayDetailDialog.rejectReason")}</div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t("attendanceDayDetailDialog.rejectPlaceholder")}
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleReject}
                    disabled={reject.isPending || rejectReason.trim().length < 3}
                  >
                    {reject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("attendanceDayDetailDialog.toRed")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRejectMode(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">{t("attendanceDayDetailDialog.checkInTime")}</div>
              <div>{fmtDateTime(day.check_in_at)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("attendanceDayDetailDialog.checkOutTime")}</div>
              <div>{fmtDateTime(day.check_out_at)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("attendanceDayDetailDialog.approvedBy")}</div>
              <div>{day.approved_by_name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("attendanceDayDetailDialog.approvedAt")}</div>
              <div>{fmtDateTime(day.approved_at)}</div>
            </div>
            {day.note && (
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">{t("common.note")}</div>
                <div className="rounded-md border border-border bg-muted/30 p-2 text-sm">
                  {day.note}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Events */}
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4" />
              {t("attendanceDayDetailDialog.eventsTitle")}{" "}
              {isPending ? `(${t("common.loading")})` : `(${detail?.events.length ?? 0})`}
            </h3>
            {detail && detail.events.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                {t("attendanceDayDetailDialog.noEvents")}
              </div>
            )}
            {detail && detail.events.length > 0 && (
              <div className="space-y-2">
                {detail.events.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-md border border-border p-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {ev.kind === "check_in"
                          ? t("attendanceDayDetailDialog.checkIn")
                          : t("attendanceDayDetailDialog.checkOut")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(ev.event_at).toLocaleTimeString(dateLocale())}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Geo: {fmtNum(ev.lat)}, {fmtNum(ev.lng)}
                      </span>
                      {ev.accuracy_m !== null && (
                        <span>± {parseFloat(String(ev.accuracy_m)).toFixed(0)} m</span>
                      )}
                      {ev.distance_m !== null && (
                        <span>
                          {t("attendanceDayDetailDialog.distanceM", {
                            value: parseFloat(String(ev.distance_m)).toFixed(0),
                          })}
                        </span>
                      )}
                      <span className={ev.is_within_fence ? "text-emerald-600" : "text-destructive"}>
                        {ev.is_within_fence
                          ? t("attendanceDayDetailDialog.withinFence")
                          : t("attendanceDayDetailDialog.outsideFence")}
                      </span>
                      {ev.wifi_ssid && <span>WiFi: {ev.wifi_ssid}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overrides */}
          {overrides && overrides.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <History className="h-4 w-4" />
                  {t("attendanceDayDetailDialog.overrideHistory")} ({overrides.length})
                </h3>
                <div className="space-y-2">
                  {overrides.map((ov) => (
                    <div key={ov.id} className="rounded-md border border-border p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {ov.previous_status} → {ov.new_status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ov.created_at).toLocaleString(dateLocale())}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {ov.super_admin_name ?? "—"}
                      </div>
                      <div className="mt-1 text-sm">{ov.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <OverrideDialog
        day={overrideOpen ? day : null}
        onClose={() => setOverrideOpen(false)}
      />
    </>
  );
}
