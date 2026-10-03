import {
  CalendarDays,
  CheckCircle2,
  History,
  Loader2,
  MapPin,
  Pencil,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { DayEditDialog } from "@/components/admin/attendance/day-edit-dialog";
import { OverrideDialog } from "@/components/admin/attendance/override-dialog";
import { formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { describeRequestError } from "@/components/attendance/request-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { dateLocale } from "@/i18n";
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

const fmtNum = (v: string | number | null): string => {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n.toFixed(6) : "—";
};

const WITH_SECONDS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
};

export function DayDetailDialog({ day, onClose }: Props) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === "super_admin";
  const locale = dateLocale();

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: detail, isPending } = useAttendanceDay(day?.id ?? null);
  const { data: overrides } = useAttendanceOverrides(day?.id ?? null);

  const approve = useApproveDay();
  const reject = useRejectDay();

  if (!day) return null;

  // Komponent ochiq-yopiq bo'lganda ham saqlanib qoladi — keyingi kunga eski holat o'tmasin
  const close = () => {
    setRejectMode(false);
    setRejectReason("");
    setOverrideOpen(false);
    setEditOpen(false);
    onClose();
  };

  const handleApprove = async () => {
    try {
      await approve.mutateAsync({ id: day.id, data: {} });
      toast.success(t("attendanceDayDetailDialog.approvedGreenToast"));
      close();
    } catch (e) {
      toast.error(describeRequestError(e, t));
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
      close();
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const statusText = (s: AttendanceDay["status"]) => t(`adminAttendance.status.${s}`);

  return (
    <>
      <Dialog open={!!day} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="break-words">{day.student_full_name ?? "—"}</div>
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
                  {approve.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {t("attendanceDayDetailDialog.approveGreen")}
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  aria-expanded={rejectMode}
                  onClick={() => setRejectMode((v) => !v)}
                >
                  <XCircle className="h-4 w-4" />
                  {t("common.reject")}
                </Button>
              </>
            )}
            {isSuperAdmin && (
              <>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  {t("common.edit")}
                </Button>
                <Button variant="outline" onClick={() => setOverrideOpen(true)}>
                  <ShieldCheck className="h-4 w-4" />
                  {t("attendanceDayDetailDialog.overrideButton")}
                </Button>
              </>
            )}
          </div>

          {rejectMode && (
            <Alert>
              <AlertDescription className="space-y-2">
                <Label htmlFor="day-reject-reason" className="text-sm font-medium">
                  {t("attendanceDayDetailDialog.rejectReason")}
                </Label>
                <Textarea
                  id="day-reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t("attendanceDayDetailDialog.rejectPlaceholder")}
                  rows={3}
                  maxLength={2000}
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
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">
                {t("attendanceDayDetailDialog.checkInTime")}
              </div>
              <div>{formatTashkentDateTime(day.check_in_at, locale)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {t("attendanceDayDetailDialog.checkOutTime")}
              </div>
              <div>{formatTashkentDateTime(day.check_out_at, locale)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {t("attendanceDayDetailDialog.approvedBy")}
              </div>
              <div>{day.approved_by_name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {t("attendanceDayDetailDialog.approvedAt")}
              </div>
              <div>{formatTashkentDateTime(day.approved_at, locale)}</div>
            </div>
            {day.note && (
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground">{t("common.note")}</div>
                <div className="break-words rounded-md border border-border bg-muted/30 p-2 text-sm">
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
                  <div key={ev.id} className="rounded-md border border-border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {ev.kind === "check_in"
                          ? t("attendanceDayDetailDialog.checkIn")
                          : t("attendanceDayDetailDialog.checkOut")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTashkentDateTime(ev.event_at, locale, WITH_SECONDS)}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {t("attendanceDayDetailDialog.coordinates")}: {fmtNum(ev.lat)},{" "}
                        {fmtNum(ev.lng)}
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
                      <span
                        className={
                          ev.is_within_fence
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }
                      >
                        {ev.is_within_fence
                          ? t("attendanceDayDetailDialog.withinFence")
                          : t("attendanceDayDetailDialog.outsideFence")}
                      </span>
                      {ev.wifi_ssid && <span>Wi-Fi: {ev.wifi_ssid}</span>}
                      {ev.device_id && (
                        <span title={ev.device_id}>
                          {t("attendanceDayDetailDialog.device")}:{" "}
                          <span className="font-mono">{ev.device_id.slice(0, 8)}</span>
                        </span>
                      )}
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
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-medium">
                          {statusText(ov.previous_status)} → {statusText(ov.new_status)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTashkentDateTime(ov.created_at, locale)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {ov.super_admin_name ?? "—"}
                      </div>
                      <div className="mt-1 break-words text-sm">{ov.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <OverrideDialog day={overrideOpen ? day : null} onClose={() => setOverrideOpen(false)} />
      <DayEditDialog
        target={editOpen ? { kind: "day", day } : null}
        onClose={() => setEditOpen(false)}
        onSaved={close}
      />
    </>
  );
}
