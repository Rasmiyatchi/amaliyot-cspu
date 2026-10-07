import { Ban, Loader2, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { GroupSearchSelect } from "@/components/admin/assignments/group-search-select";
import { StudentSearchSelect } from "@/components/admin/assignments/student-search-select";
import { SupervisorSearchSelect } from "@/components/admin/assignments/supervisor-search-select";
import { fromDatetimeLocal } from "@/components/attendance/attendance-date-utils";
import { describeRequestError } from "@/components/attendance/request-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAccessRestriction } from "@/lib/api/access-restrictions";
import type { RestrictionMode } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type TargetKind = "student" | "group" | "supervisor";

/** Talaba kartasidan ochilganda — nishon oldindan tanlangan */
export type RestrictionPreset = { kind: "student"; id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  preset?: RestrictionPreset | null;
};

const MODES: { value: RestrictionMode; icon: typeof Wrench }[] = [
  { value: "restricted", icon: Ban },
  { value: "maintenance", icon: Wrench },
];

export function RestrictionFormDialog({ open, onClose, preset = null }: Props) {
  const { t } = useTranslation();
  const create = useCreateAccessRestriction();

  const [kind, setKind] = useState<TargetKind>("student");
  const [targetId, setTargetId] = useState("");
  const [mode, setMode] = useState<RestrictionMode>("restricted");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [touched, setTouched] = useState(false);

  // Har ochilishda toza forma (oldingi tanlov qolib ketmasin)
  useEffect(() => {
    if (!open) return;
    setKind("student");
    setTargetId(preset?.id ?? "");
    setMode("restricted");
    setMessage("");
    setNote("");
    setEndsAt("");
    setTouched(false);
  }, [open, preset?.id]);

  const endsAtIso = endsAt ? fromDatetimeLocal(endsAt) : null;
  const endsAtInPast = !!endsAtIso && new Date(endsAtIso).getTime() <= Date.now();
  const targetMissing = !targetId;

  const handleSubmit = async () => {
    setTouched(true);
    if (targetMissing || endsAtInPast) return;
    try {
      await create.mutateAsync({
        target_type: kind === "group" ? "group" : "user",
        ...(kind === "student" ? { student_id: targetId } : {}),
        ...(kind === "supervisor" ? { supervisor_id: targetId } : {}),
        ...(kind === "group" ? { group_id: targetId } : {}),
        mode,
        message: message.trim() || null,
        note: note.trim() || null,
        ends_at: endsAtIso,
      });
      toast.success(t("adminAccessRestrictions.toastCreated"));
      onClose();
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const changeKind = (next: TargetKind) => {
    setKind(next);
    setTargetId("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !create.isPending && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {preset
              ? t("restrictionForm.titlePreset", { name: preset.label })
              : t("restrictionForm.title")}
          </DialogTitle>
          <DialogDescription>{t("restrictionForm.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!preset && (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
              <div className="space-y-1.5">
                <Label htmlFor="restriction-kind">{t("restrictionForm.targetType")}</Label>
                <Select value={kind} onValueChange={(v) => changeKind(v as TargetKind)}>
                  <SelectTrigger id="restriction-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">{t("restrictionForm.targetStudent")}</SelectItem>
                    <SelectItem value="group">{t("restrictionForm.targetGroup")}</SelectItem>
                    <SelectItem value="supervisor">
                      {t("restrictionForm.targetSupervisor")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("restrictionForm.target")}</Label>
                {kind === "student" && (
                  <StudentSearchSelect
                    value={targetId}
                    onValueChange={setTargetId}
                    placeholder={t("restrictionForm.pickStudent")}
                  />
                )}
                {kind === "group" && (
                  <GroupSearchSelect
                    value={targetId}
                    onValueChange={setTargetId}
                    placeholder={t("restrictionForm.pickGroup")}
                  />
                )}
                {kind === "supervisor" && (
                  <SupervisorSearchSelect
                    value={targetId}
                    onValueChange={setTargetId}
                    placeholder={t("restrictionForm.pickSupervisor")}
                  />
                )}
                {touched && targetMissing && (
                  <p className="text-xs text-destructive">{t("restrictionForm.targetRequired")}</p>
                )}
              </div>
            </div>
          )}

          {/* Rejim */}
          <div className="space-y-1.5">
            <Label>{t("restrictionForm.mode")}</Label>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
              {MODES.map(({ value, icon: Icon }) => {
                const active = mode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMode(value)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        value === "restricted" ? "text-destructive" : "text-amber-600",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {t(`adminAccessRestrictions.mode.${value}`)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t(`adminAccessRestrictions.modeHint.${value}`)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="restriction-message">{t("restrictionForm.message")}</Label>
            <Textarea
              id="restriction-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder={t("restrictionForm.messagePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {mode === "maintenance"
                ? t("restrictionForm.messageHintMaintenance")
                : t("restrictionForm.messageHintRestricted")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="restriction-ends">{t("restrictionForm.endsAt")}</Label>
              <Input
                id="restriction-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {endsAtInPast ? t("restrictionForm.endsAtPast") : t("restrictionForm.endsAtHint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="restriction-note">{t("restrictionForm.note")}</Label>
              <Input
                id="restriction-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                placeholder={t("restrictionForm.notePlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("restrictionForm.noteHint")}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={create.isPending || endsAtInPast}
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            {t("restrictionForm.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
