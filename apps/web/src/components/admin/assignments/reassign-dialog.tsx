import { CheckCircle2, Eye, Info, Loader2, Repeat, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { GroupSearchSelect } from "@/components/admin/assignments/group-search-select";
import { StudentSearchSelect } from "@/components/admin/assignments/student-search-select";
import { WeekdayPicker, formatWeekdays } from "@/components/admin/assignments/weekday-picker";
import { formatTashkentDate } from "@/components/attendance/attendance-date-utils";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dateLocale } from "@/i18n";
import { useAcademicYears, useAllFaculties } from "@/lib/api/academic";
import {
  useReassignAssignments,
  type ReassignResult,
  type ReassignScope,
  type ReassignTarget,
} from "@/lib/api/assignments";
import { usePracticeTypes } from "@/lib/api/practice-types";
import type { Semester, UUID } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

const ANY = "__any__";
const SAME = "__same__";
const NONE = "__none__";

type ScopeKind = "selected" | "group" | "faculty" | "student";

export type ReassignDefaults = {
  academic_year_id?: UUID;
  semester?: Semester;
  practice_type_id?: UUID;
  group_id?: UUID;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Jadvalda tanlangan biriktirishlar */
  selectedIds: UUID[];
  /** Sahifa filtrlari — manba qamrovining boshlang'ich qiymatlari */
  defaults?: ReassignDefaults;
  onApplied?: () => void;
};

/**
 * Qayta biriktirish: 1-semestr biriktirishlarini yangi davrga ko'chirish.
 * Obyekt (tashkilot/hudud) va supervizor avtomatik saqlanadi; faqat tur, semestr, sanalar va
 * majburiy kunlar o'zgaradi. Eski biriktirishlar va ularning tarixi o'chirilmaydi.
 */
export function ReassignDialog({ open, onClose, selectedIds, defaults, onApplied }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const facultyLocked = user?.role === "admin" && !!user.faculty_id;
  const years = useAcademicYears();
  const faculties = useAllFaculties();
  const practiceTypes = usePracticeTypes();
  const mutation = useReassignAssignments();

  const [scopeKind, setScopeKind] = useState<ScopeKind>("group");
  const [groupId, setGroupId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [srcYear, setSrcYear] = useState("");
  const [srcSemester, setSrcSemester] = useState<string>("fall");
  const [srcType, setSrcType] = useState<string>(ANY);

  const [tgtType, setTgtType] = useState<string>(SAME);
  const [tgtYear, setTgtYear] = useState<string>(SAME);
  const [tgtSemester, setTgtSemester] = useState<string>("spring");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [keepWeekdays, setKeepWeekdays] = useState(true);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [activate, setActivate] = useState(false);
  const [notes, setNotes] = useState("");

  const [preview, setPreview] = useState<ReassignResult | null>(null);
  const [applied, setApplied] = useState<ReassignResult | null>(null);

  const defaultsRef = useRef({ defaults, selectedIds, facultyId: user?.faculty_id ?? "" });
  useEffect(() => {
    defaultsRef.current = { defaults, selectedIds, facultyId: user?.faculty_id ?? "" };
  });

  // Har ochilishda: sahifa filtrlari va tanlov bo'yicha boshlang'ich holat
  useEffect(() => {
    if (!open) return;
    const { defaults: d, selectedIds: ids, facultyId: ownFaculty } = defaultsRef.current;
    setScopeKind(ids.length > 0 ? "selected" : "group");
    setGroupId(d?.group_id ?? "");
    setFacultyId(ownFaculty);
    setStudentId("");
    setSrcYear(d?.academic_year_id ?? "");
    setSrcSemester(d?.semester ?? "fall");
    setSrcType(d?.practice_type_id ?? ANY);
    setTgtType(SAME);
    setTgtYear(SAME);
    setTgtSemester(d?.semester === "spring" ? "fall" : "spring");
    setStartDate("");
    setEndDate("");
    setKeepWeekdays(true);
    setWeekdays([1, 2, 3, 4, 5]);
    setActivate(false);
    setNotes("");
    setPreview(null);
    setApplied(null);
  }, [open]);

  // O'quv yili tanlanmagan bo'lsa — faol yil
  useEffect(() => {
    if (!open || srcYear || !years.data) return;
    const active = years.data.find((y) => y.is_active) ?? years.data[0];
    if (active) setSrcYear(active.id);
  }, [open, srcYear, years.data]);

  const source = useMemo<ReassignScope | null>(() => {
    if (!srcYear) return null;
    const base: ReassignScope = {
      academic_year_id: srcYear,
      semester: srcSemester === ANY ? null : (srcSemester as Semester),
      practice_type_id: srcType === ANY ? null : srcType,
    };
    if (scopeKind === "selected")
      return selectedIds.length ? { ...base, assignment_ids: selectedIds } : null;
    if (scopeKind === "group") return groupId ? { ...base, group_id: groupId } : null;
    if (scopeKind === "faculty") return facultyId ? { ...base, faculty_id: facultyId } : null;
    return studentId ? { ...base, student_ids: [studentId] } : null;
  }, [srcYear, srcSemester, srcType, scopeKind, selectedIds, groupId, facultyId, studentId]);

  const target = useMemo<ReassignTarget | null>(() => {
    if (!startDate || !endDate || endDate < startDate) return null;
    if (!keepWeekdays && weekdays.length === 0) return null;
    return {
      practice_type_id: tgtType === SAME ? null : tgtType,
      academic_year_id: tgtYear === SAME ? null : tgtYear,
      semester: tgtSemester === NONE ? null : (tgtSemester as Semester),
      start_date: startDate,
      end_date: endDate,
      required_weekdays: keepWeekdays ? null : weekdays,
      keep_weekdays: keepWeekdays,
      activate,
      notes: notes.trim() || null,
    };
  }, [tgtType, tgtYear, tgtSemester, startDate, endDate, keepWeekdays, weekdays, activate, notes]);

  // Forma o'zgarsa oldingi ko'rinish yaroqsiz
  useEffect(() => {
    setPreview(null);
  }, [source, target]);

  const datesInvalid = !!startDate && !!endDate && endDate < startDate;

  const run = async (dryRun: boolean) => {
    if (!source || !target) return;
    try {
      const res = await mutation.mutateAsync({ source, target, dry_run: dryRun });
      if (dryRun) {
        setPreview(res);
      } else {
        setApplied(res);
        setPreview(null);
        if (res.failed === 0) toast.success(t("reassign.toastApplied", { n: res.created }));
        else toast.warning(t("reassign.toastPartial", { n: res.created, failed: res.failed }));
        onApplied?.();
      }
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const result = applied ?? preview;
  const locale = dateLocale();
  const scopeKinds: ScopeKind[] = selectedIds.length
    ? ["selected", "group", "faculty", "student"]
    : ["group", "faculty", "student"];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !mutation.isPending && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            {t("reassign.title")}
          </DialogTitle>
          <DialogDescription>{t("reassign.description")}</DialogDescription>
        </DialogHeader>

        {!applied && (
          <div className="space-y-5">
            {/* 1. Kimlar */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t("reassign.step1")}</h3>
              <div
                className="flex flex-wrap gap-1.5"
                role="radiogroup"
                aria-label={t("reassign.step1")}
              >
                {scopeKinds.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={scopeKind === k}
                    onClick={() => setScopeKind(k)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      scopeKind === k
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {k === "selected"
                      ? t("reassign.scope.selected", { n: selectedIds.length })
                      : t(`reassign.scope.${k}`)}
                  </button>
                ))}
              </div>
              {scopeKind === "group" && (
                <GroupSearchSelect
                  value={groupId}
                  onValueChange={setGroupId}
                  placeholder={t("reassign.pickGroup")}
                />
              )}
              {scopeKind === "faculty" && (
                <Select
                  value={facultyId || undefined}
                  onValueChange={setFacultyId}
                  disabled={facultyLocked}
                >
                  <SelectTrigger aria-label={t("common.faculty")}>
                    <SelectValue placeholder={t("reassign.pickFaculty")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {(faculties.data ?? []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {scopeKind === "student" && (
                <StudentSearchSelect
                  value={studentId}
                  onValueChange={setStudentId}
                  placeholder={t("reassign.pickStudent")}
                />
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{t("reassign.sourceYear")}</Label>
                  <Select value={srcYear || undefined} onValueChange={setSrcYear}>
                    <SelectTrigger aria-label={t("reassign.sourceYear")}>
                      <SelectValue placeholder={t("common.academicYear")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(years.data ?? []).map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.name}
                          {y.is_active ? t("common.activeSuffix") : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("reassign.sourceSemester")}</Label>
                  <Select value={srcSemester} onValueChange={setSrcSemester}>
                    <SelectTrigger aria-label={t("reassign.sourceSemester")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>{t("reassign.anySemester")}</SelectItem>
                      <SelectItem value="fall">{t("common.semesterFall")}</SelectItem>
                      <SelectItem value="spring">{t("common.semesterSpring")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("reassign.sourceType")}</Label>
                  <Select value={srcType} onValueChange={setSrcType}>
                    <SelectTrigger aria-label={t("reassign.sourceType")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value={ANY}>{t("adminAssignments.allTypes")}</SelectItem>
                      {(practiceTypes.data ?? []).map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* 2. Yangi davr */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t("reassign.step2")}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{t("common.practiceType")}</Label>
                  <Select value={tgtType} onValueChange={setTgtType}>
                    <SelectTrigger aria-label={t("common.practiceType")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value={SAME}>{t("reassign.sameAsSource")}</SelectItem>
                      {(practiceTypes.data ?? []).map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("common.academicYear")}</Label>
                  <Select value={tgtYear} onValueChange={setTgtYear}>
                    <SelectTrigger aria-label={t("common.academicYear")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SAME}>{t("reassign.sameAsSource")}</SelectItem>
                      {(years.data ?? []).map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("common.semester")}</Label>
                  <Select value={tgtSemester} onValueChange={setTgtSemester}>
                    <SelectTrigger aria-label={t("common.semester")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fall">{t("common.semesterFall")}</SelectItem>
                      <SelectItem value="spring">{t("common.semesterSpring")}</SelectItem>
                      <SelectItem value={NONE}>{t("reassign.noSemester")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ra-start">{t("student.startDate")}</Label>
                  <Input
                    id="ra-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ra-end">{t("student.endDate")}</Label>
                  <Input
                    id="ra-end"
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              {datesInvalid && (
                <p className="text-xs text-destructive">{t("bulkEdit.datesInvalid")}</p>
              )}

              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="text-sm font-medium">{t("bulkEdit.fields.weekdays")}</div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="ra-weekdays"
                    className="accent-primary"
                    checked={keepWeekdays}
                    onChange={() => setKeepWeekdays(true)}
                  />
                  {t("reassign.keepWeekdays")}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="ra-weekdays"
                    className="accent-primary"
                    checked={!keepWeekdays}
                    onChange={() => setKeepWeekdays(false)}
                  />
                  {t("reassign.newWeekdays")}
                </label>
                {!keepWeekdays && <WeekdayPicker value={weekdays} onChange={setWeekdays} />}
              </div>

              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={activate}
                  onChange={(e) => setActivate(e.target.checked)}
                />
                <span>
                  {t("reassign.activate")}
                  <span className="block text-xs text-muted-foreground">
                    {t("reassign.activateHint")}
                  </span>
                </span>
              </label>
              <div className="space-y-1.5">
                <Label htmlFor="ra-notes">{t("common.note")}</Label>
                <Textarea
                  id="ra-notes"
                  rows={2}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </section>

            <Alert className="py-2.5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">{t("reassign.safetyNote")}</AlertDescription>
            </Alert>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{t("reassign.summary.total", { n: result.total })}</Badge>
              {result.dry_run ? (
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                  {t("reassign.summary.ready", { n: result.ok })}
                </Badge>
              ) : (
                <Badge className="bg-success/15 text-success hover:bg-success/15">
                  {t("reassign.summary.created", { n: result.created })}
                </Badge>
              )}
              {result.failed > 0 && (
                <Badge variant="destructive">
                  {t("reassign.summary.failed", { n: result.failed })}
                </Badge>
              )}
            </div>
            {result.total === 0 ? (
              <Alert>
                <AlertDescription>{t("reassign.nothingFound")}</AlertDescription>
              </Alert>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
                {result.items.map((item) => (
                  <li key={item.source_assignment_id} className="space-y-1 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.student_full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.student_hemis_id}
                          {item.group_name ? ` · ${item.group_name}` : ""}
                          {" · "}
                          {item.object_name ?? "—"}
                          {" · "}
                          {item.supervisor_full_name ?? t("reassign.noSupervisor")}
                        </div>
                      </div>
                      {item.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.source_practice_type_name}
                      {item.source_semester
                        ? ` · ${t(item.source_semester === "fall" ? "common.semesterFall" : "common.semesterSpring")}`
                        : ""}
                      {" · "}
                      {formatTashkentDate(item.source_start_date, locale)} —{" "}
                      {formatTashkentDate(item.source_end_date, locale)}
                      {" → "}
                      <span className="text-foreground">
                        {item.target_practice_type_name}
                        {item.target_semester
                          ? ` · ${t(item.target_semester === "fall" ? "common.semesterFall" : "common.semesterSpring")}`
                          : ""}
                        {" · "}
                        {formatWeekdays(item.target_required_weekdays)}
                      </span>
                    </div>
                    {item.error && <p className="text-xs text-destructive">{item.error}</p>}
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
              onClick={() => void run(true)}
              disabled={!source || !target || mutation.isPending}
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
              onClick={() => void run(false)}
              disabled={mutation.isPending || preview.ok === 0}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
              {t("reassign.apply", { n: preview.ok })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
