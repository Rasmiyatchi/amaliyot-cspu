import { Clock, Loader2, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  formatPracticeMinutes,
  MAX_PRACTICE_MINUTES,
  parsePracticeMinutes,
} from "@/components/attendance/practice-duration";
import { describeRequestError } from "@/components/attendance/request-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateStudentPracticeHours } from "@/lib/api/students";
import { useAttendanceSettings } from "@/lib/api/system-settings";
import type { Student } from "@/lib/api/types";

type Props = { student: Student };

/**
 * Talaba kartasida: kunlik majburiy amaliyot vaqti ("ketish" shundan keyin ochiladi).
 * Individual qiymat bo'lmasa umumiy sozlama (Tizim sozlamalari) amal qiladi.
 */
export function PracticeHoursSection({ student }: Props) {
  const { t } = useTranslation();
  const settings = useAttendanceSettings();
  const update = useUpdateStudentPracticeHours();
  const individual = student.min_practice_minutes ?? null;
  const common = settings.data?.min_practice_minutes ?? null;

  const [editing, setEditing] = useState(false);
  const start = individual ?? common ?? 240;
  const [hours, setHours] = useState(String(Math.floor(start / 60)));
  const [mins, setMins] = useState(String(start % 60));
  const parsed = parsePracticeMinutes(hours, mins);

  const openEditor = () => {
    const value = individual ?? common ?? 240;
    setHours(String(Math.floor(value / 60)));
    setMins(String(value % 60));
    setEditing(true);
  };

  const save = async (minutes: number | null) => {
    try {
      await update.mutateAsync({ id: student.id, minutes });
      toast.success(
        minutes === null
          ? t("practiceHours.toastReset")
          : t("practiceHours.toastSaved", { duration: formatPracticeMinutes(minutes, t) }),
      );
      setEditing(false);
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const effective = individual ?? common;

  return (
    <div className="min-w-0 space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {t("practiceHours.studentTitle")}
      </h3>
      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <div className="text-sm font-medium">
              {effective !== null ? formatPracticeMinutes(effective, t) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {individual !== null
                ? t("practiceHours.individualNote", {
                    common: common !== null ? formatPracticeMinutes(common, t) : "—",
                  })
                : t("practiceHours.commonNote")}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {individual !== null && (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                {t("practiceHours.individualBadge")}
              </Badge>
            )}
            {!editing && (
              <Button size="sm" variant="outline" onClick={openEditor}>
                {individual !== null ? t("common.edit") : t("practiceHours.setIndividual")}
              </Button>
            )}
          </div>
        </div>

        {editing && (
          <div className="space-y-2 border-t border-border/60 pt-3">
            <div className="grid max-w-xs grid-cols-2 gap-2">
              <div>
                <Label htmlFor="st-practice-h" className="text-xs">
                  {t("practiceHours.hoursLabel")}
                </Label>
                <Input
                  id="st-practice-h"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_PRACTICE_MINUTES / 60}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  aria-invalid={parsed === null}
                />
              </div>
              <div>
                <Label htmlFor="st-practice-m" className="text-xs">
                  {t("practiceHours.minutesLabel")}
                </Label>
                <Input
                  id="st-practice-m"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  step={5}
                  value={mins}
                  onChange={(e) => setMins(e.target.value)}
                  aria-invalid={parsed === null}
                />
              </div>
            </div>
            {parsed === null && (
              <p className="text-xs text-destructive">
                {t("practiceHours.invalid", { max: MAX_PRACTICE_MINUTES / 60 })}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => parsed !== null && void save(parsed)}
                disabled={parsed === null || update.isPending}
              >
                {update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("common.save")}
              </Button>
              {individual !== null && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void save(null)}
                  disabled={update.isPending}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("practiceHours.resetToCommon")}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={update.isPending}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
