import { AlertTriangle, ArrowRight, CheckCircle2, Eye, Loader2, Save, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SupervisorSearchSelect } from "@/components/admin/assignments/supervisor-search-select";
import { WeekdayPicker } from "@/components/admin/assignments/weekday-picker";
import { fieldLabel, formatChangeValue } from "@/components/admin/audit/change-format";
import { describeRequestError } from "@/components/attendance/request-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  useBulkUpdateAssignments,
  type AssignmentBulkChanges,
  type AssignmentBulkUpdateRequest,
  type BulkUpdateResult,
} from "@/lib/api/assignments";
import type { Semester, UUID } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Qaysi biriktirishlar tahrirlanadi: aniq ro'yxat yoki guruh (+ filtrlar). */
export type BulkEditScope = {
  assignment_ids?: UUID[];
  group_id?: UUID;
  academic_year_id?: UUID;
  semester?: Semester;
  practice_type_id?: UUID;
  /** Sarlavhada ko'rsatiladigan qisqa tavsif ("3 ta tanlangan", "2301-01 guruhi") */
  label: string;
};

type Props = {
  open: boolean;
  scope: BulkEditScope | null;
  onClose: () => void;
  /** Muvaffaqiyatli saqlangach (masalan, tanlovni tozalash uchun) */
  onApplied?: () => void;
  /** Bitta biriktirish tahrirlanganda boshlang'ich qiymatlar */
  initial?: BulkEditInitial;
};

export type BulkEditInitial = {
  required_weekdays?: number[] | null;
  supervisor_id?: UUID | null;
  start_date?: string;
  end_date?: string;
};

type FieldKey = "weekdays" | "supervisor" | "start" | "end";

/**
 * Faol biriktirishlarni tahrirlash (bitta yoki ommaviy): majburiy kunlar, supervizor, sanalar.
 * Ikki bosqich: "Oldindan ko'rish" (hech narsa yozilmaydi) → "Tasdiqlash va saqlash".
 * Davomat va hisobotlar o'zgarmaydi; har bir o'zgarish audit jurnaliga eski/yangi qiymat bilan yoziladi.
 */
export function BulkEditDialog({ open, scope, onClose, onApplied, initial }: Props) {
  const { t } = useTranslation();
  const mutation = useBulkUpdateAssignments();

  const [enabled, setEnabled] = useState<Record<FieldKey, boolean>>({
    weekdays: false,
    supervisor: false,
    start: false,
    end: false,
  });
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [supervisorId, setSupervisorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preview, setPreview] = useState<BulkUpdateResult | null>(null);
  const [applied, setApplied] = useState<BulkUpdateResult | null>(null);

  // `initial` har renderda yangi obyekt bo'lishi mumkin — faqat ochilish paytidagisi olinadi
  const initialRef = useRef(initial);
  useEffect(() => {
    initialRef.current = initial;
  });

  // Har ochilishda toza forma
  useEffect(() => {
    if (!open) return;
    const init = initialRef.current;
    setEnabled({ weekdays: false, supervisor: false, start: false, end: false });
    setWeekdays(init?.required_weekdays?.length ? init.required_weekdays : [1, 2, 3, 4, 5]);
    setSupervisorId(init?.supervisor_id ?? "");
    setStartDate(init?.start_date ?? "");
    setEndDate(init?.end_date ?? "");
    setPreview(null);
    setApplied(null);
  }, [open]);

  const changes = useMemo<AssignmentBulkChanges>(() => {
    const c: AssignmentBulkChanges = {};
    if (enabled.weekdays) c.required_weekdays = weekdays;
    if (enabled.supervisor) c.supervisor_id = supervisorId || null;
    if (enabled.start && startDate) c.start_date = startDate;
    if (enabled.end && endDate) c.end_date = endDate;
    return c;
  }, [enabled, weekdays, supervisorId, startDate, endDate]);

  // Forma o'zgarsa eski oldindan ko'rish yaroqsiz
  useEffect(() => {
    setPreview(null);
  }, [changes]);

  const hasChanges = Object.keys(changes).length > 0;
  const weekdaysEmpty = enabled.weekdays && weekdays.length === 0;
  const datesInvalid =
    enabled.start && enabled.end && !!startDate && !!endDate && endDate < startDate;
  const canPreview = hasChanges && !weekdaysEmpty && !datesInvalid && !!scope;

  const request = (dryRun: boolean): AssignmentBulkUpdateRequest => ({
    ...(scope?.assignment_ids ? { assignment_ids: scope.assignment_ids } : {}),
    ...(scope?.group_id ? { group_id: scope.group_id } : {}),
    ...(scope?.academic_year_id ? { academic_year_id: scope.academic_year_id } : {}),
    ...(scope?.semester ? { semester: scope.semester } : {}),
    ...(scope?.practice_type_id ? { practice_type_id: scope.practice_type_id } : {}),
    changes,
    dry_run: dryRun,
  });

  const handlePreview = async () => {
    try {
      setPreview(await mutation.mutateAsync(request(true)));
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const handleApply = async () => {
    try {
      const res = await mutation.mutateAsync(request(false));
      setApplied(res);
      setPreview(null);
      if (res.failed === 0) {
        toast.success(t("bulkEdit.toastApplied", { n: res.updated }));
      } else {
        toast.warning(t("bulkEdit.toastPartial", { n: res.updated, failed: res.failed }));
      }
      onApplied?.();
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const toggle = (key: FieldKey) => setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  const result = applied ?? preview;
  const willChange = preview ? preview.items.filter((i) => i.ok && i.changes.length > 0).length : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !mutation.isPending && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("bulkEdit.title")}</DialogTitle>
          <DialogDescription>
            {scope?.label} · {t("bulkEdit.description")}
          </DialogDescription>
        </DialogHeader>

        {!applied && (
          <div className="space-y-3">
            <FieldRow
              id="be-weekdays"
              checked={enabled.weekdays}
              onToggle={() => toggle("weekdays")}
              label={t("bulkEdit.fields.weekdays")}
            >
              <WeekdayPicker value={weekdays} onChange={setWeekdays} disabled={!enabled.weekdays} />
              {weekdaysEmpty && (
                <p className="mt-1 text-xs text-destructive">{t("bulkEdit.weekdaysRequired")}</p>
              )}
            </FieldRow>

            <FieldRow
              id="be-supervisor"
              checked={enabled.supervisor}
              onToggle={() => toggle("supervisor")}
              label={t("bulkEdit.fields.supervisor")}
              hint={t("bulkEdit.supervisorHint")}
            >
              <SupervisorSearchSelect
                value={supervisorId}
                onValueChange={setSupervisorId}
                disabled={!enabled.supervisor}
                placeholder={t("bulkEdit.supervisorPlaceholder")}
                noneLabel={t("bulkEdit.supervisorNone")}
              />
            </FieldRow>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow
                id="be-start"
                checked={enabled.start}
                onToggle={() => toggle("start")}
                label={t("bulkEdit.fields.startDate")}
              >
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={!enabled.start}
                  aria-label={t("bulkEdit.fields.startDate")}
                />
              </FieldRow>
              <FieldRow
                id="be-end"
                checked={enabled.end}
                onToggle={() => toggle("end")}
                label={t("bulkEdit.fields.endDate")}
              >
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={!enabled.end}
                  aria-label={t("bulkEdit.fields.endDate")}
                />
              </FieldRow>
            </div>
            {datesInvalid && (
              <p className="text-xs text-destructive">{t("bulkEdit.datesInvalid")}</p>
            )}

            <Alert className="py-2.5">
              <AlertDescription className="text-xs">{t("bulkEdit.safetyNote")}</AlertDescription>
            </Alert>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{t("bulkEdit.summary.total", { n: result.total })}</Badge>
              {result.dry_run ? (
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                  {t("bulkEdit.summary.willChange", { n: willChange })}
                </Badge>
              ) : (
                <Badge className="bg-success/15 text-success hover:bg-success/15">
                  {t("bulkEdit.summary.updated", { n: result.updated })}
                </Badge>
              )}
              {result.unchanged > 0 && (
                <Badge variant="secondary">
                  {t("bulkEdit.summary.unchanged", { n: result.unchanged })}
                </Badge>
              )}
              {result.failed > 0 && (
                <Badge variant="destructive">
                  {t("bulkEdit.summary.failed", { n: result.failed })}
                </Badge>
              )}
            </div>
            {result.total === 0 ? (
              <Alert>
                <AlertDescription>{t("bulkEdit.nothingFound")}</AlertDescription>
              </Alert>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
                {result.items.map((item) => (
                  <li key={item.assignment_id} className="space-y-1 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.student_full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.student_hemis_id}
                          {item.group_name ? ` · ${item.group_name}` : ""}
                        </div>
                      </div>
                      {!item.ok ? (
                        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                      ) : item.changes.length === 0 ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {t("bulkEdit.noDiff")}
                        </span>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      )}
                    </div>
                    {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                    {item.changes.map((c) => (
                      <div
                        key={c.field}
                        className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <span className="font-medium text-foreground">{fieldLabel(c.field)}:</span>
                        <span className="line-through decoration-destructive/60">
                          {formatChangeValue(c.field, c.before, c.before_label)}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-foreground">
                          {formatChangeValue(c.field, c.after, c.after_label)}
                        </span>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            {applied ? t("common.close") : t("common.cancel")}
          </Button>
          {!applied && (
            <Button
              variant="outline"
              onClick={() => void handlePreview()}
              disabled={!canPreview || mutation.isPending}
            >
              {mutation.isPending && !preview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {t("bulkEdit.preview")}
            </Button>
          )}
          {!applied && preview && (
            <Button
              onClick={() => void handleApply()}
              disabled={mutation.isPending || willChange === 0}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : willChange === 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("bulkEdit.apply", { n: willChange })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({
  id,
  checked,
  onToggle,
  label,
  hint,
  children,
}: {
  id: string;
  checked: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-3 transition-colors",
        checked ? "border-primary/40 bg-primary/5" : "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          className="h-4 w-4 cursor-pointer accent-primary"
          checked={checked}
          onChange={onToggle}
        />
        <Label htmlFor={id} className="cursor-pointer text-sm">
          {label}
        </Label>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
