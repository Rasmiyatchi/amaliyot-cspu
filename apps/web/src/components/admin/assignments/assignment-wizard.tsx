import { AlertCircle, CheckCircle2, Loader2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAcademicYears } from "@/lib/api/academic";
import {
  useBulkCreateAssignment,
  useCreateAssignment,
} from "@/lib/api/assignments";
import { usePracticeTypes } from "@/lib/api/practice-types";
import type { PracticeType, Semester } from "@/lib/api/types";
import { AreaSearchSelect } from "@/components/admin/assignments/area-search-select";
import { GroupSearchSelect } from "@/components/admin/assignments/group-search-select";
import { OrganizationSearchSelect } from "@/components/admin/assignments/organization-search-select";
import { StudentSearchSelect } from "@/components/admin/assignments/student-search-select";
import { useGroupStudents } from "@/components/admin/assignments/student-queries";
import { SupervisorSearchSelect } from "@/components/admin/assignments/supervisor-search-select";
import { WeekdayPicker } from "@/components/admin/assignments/weekday-picker";
import { addDays } from "@/components/attendance/attendance-date-utils";

const NONE = "__none__";

const SEMESTERS: { value: Semester; labelKey: string }[] = [
  { value: "fall", labelKey: "common.semesterFall" },
  { value: "spring", labelKey: "common.semesterSpring" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

type Mode = "single" | "group";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(start: string, end: string): number {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS,
  );
}

/**
 * Semestr boshlanish oyidan — backend ham shu qoidani ishlatadi (task.py:_semester_for_date):
 * 8-oy va undan keyin — kuzgi, aks holda bahorgi.
 */
function inferSemester(startDate: string): Semester {
  return Number(startDate.slice(5, 7)) >= 8 ? "fall" : "spring";
}

type DurationCheck =
  | { kind: "error"; message: string }
  | { kind: "warning"; message: string }
  | null;

export function AssignmentWizard({ open, onClose }: Props) {
  const { t } = useTranslation();
  const practiceTypes = usePracticeTypes();
  const academicYears = useAcademicYears();

  const [mode, setMode] = useState<Mode>("single");
  const [practiceTypeId, setPracticeTypeId] = useState<string>("");
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [singleStudentId, setSingleStudentId] = useState<string>("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [organizationId, setOrganizationId] = useState<string>("");
  const [areaId, setAreaId] = useState<string>("");
  const [supervisorId, setSupervisorId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  // Qo'lda kiritilgan tugash sanasi / semestr avtomatik taklif bilan ustidan yozilmaydi
  const [endTouched, setEndTouched] = useState(false);
  const [semester, setSemester] = useState<string>(NONE);
  const [semesterTouched, setSemesterTouched] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [notes, setNotes] = useState<string>("");

  const practiceType: PracticeType | undefined = useMemo(
    () => practiceTypes.data?.find((p) => p.id === practiceTypeId),
    [practiceTypes.data, practiceTypeId],
  );

  // Faol o'quv yili — standart qiymat
  useEffect(() => {
    if (!academicYearId && academicYears.data?.length) {
      const active = academicYears.data.find((ay) => ay.is_active);
      if (active) setAcademicYearId(active.id);
    }
  }, [academicYears.data, academicYearId]);

  // Guruh rejimi — faqat guruh tanlanganda so'raladi
  const groupStudentsQuery = useGroupStudents(mode === "group" && groupId ? groupId : null);
  const groupStudents = useMemo(
    () => groupStudentsQuery.data?.items ?? [],
    [groupStudentsQuery.data],
  );

  const allowedCourses = useMemo(
    () => practiceType?.allowed_courses ?? [],
    [practiceType],
  );

  const suggestEnd = (start: string, type: PracticeType | undefined) =>
    start && type ? addDays(start, type.min_weeks * 7) : "";

  const handlePracticeTypeChange = (id: string) => {
    setPracticeTypeId(id);
    // Obyekt turi o'zgarishi mumkin — tanlangan obyekt va supervizor tozalanadi
    setOrganizationId("");
    setAreaId("");
    setSupervisorId("");
    if (!endTouched) {
      setEndDate(suggestEnd(startDate, practiceTypes.data?.find((p) => p.id === id)));
    }
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (!endTouched) setEndDate(suggestEnd(value, practiceType));
    if (!semesterTouched) setSemester(value ? inferSemester(value) : NONE);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    // Tozalansa — yana avtomatik taklif qilinadi
    setEndTouched(value !== "");
  };

  const handleGroupChange = (id: string) => {
    setGroupId(id);
    // Oldingi guruhdan tanlangan talabalar yangi guruh bilan yuborilib ketmasin
    setSelectedStudentIds(new Set());
  };

  // Sana va davomiylik — backend (_validate_and_resolve) bilan bir xil qoidalar
  const durationCheck: DurationCheck = useMemo(() => {
    if (!startDate || !endDate) return null;
    const days = daysBetween(startDate, endDate);
    if (days < 0) {
      return { kind: "error", message: t("assignmentsAssignmentWizard.endBeforeStart") };
    }
    if (!practiceType) return null;
    const weeks = days / 7;
    const weeksText = weeks.toFixed(1);
    if (weeks + 0.01 < practiceType.min_weeks) {
      return {
        kind: "error",
        message: t("assignmentsAssignmentWizard.durationTooShort", {
          weeks: weeksText,
          min: practiceType.min_weeks,
        }),
      };
    }
    // Uzoq amaliyotlar (4+2) qish ta'tili orqali o'tadi — backend 1.5x + 2 hafta zaxira beradi
    const maxAllowed = practiceType.max_weeks * 1.5 + 2;
    if (weeks > maxAllowed) {
      return {
        kind: "error",
        message: t("assignmentsAssignmentWizard.durationTooLong", {
          weeks: weeksText,
          max: practiceType.max_weeks,
          allowed: Math.floor(maxAllowed),
        }),
      };
    }
    if (weeks > practiceType.max_weeks) {
      return {
        kind: "warning",
        message: t("assignmentsAssignmentWizard.durationOverMax", {
          weeks: weeksText,
          max: practiceType.max_weeks,
        }),
      };
    }
    return null;
  }, [startDate, endDate, practiceType, t]);

  const createOne = useCreateAssignment();
  const createBulk = useBulkCreateAssignment();

  const resetAll = () => {
    setMode("single");
    setPracticeTypeId("");
    setGroupId("");
    setSingleStudentId("");
    setSelectedStudentIds(new Set());
    setOrganizationId("");
    setAreaId("");
    setSupervisorId("");
    setStartDate("");
    setEndDate("");
    setEndTouched(false);
    setSemester(NONE);
    setSemesterTouched(false);
    setWeekdays([]);
    setNotes("");
    createOne.reset();
    createBulk.reset();
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const canSubmit =
    !!practiceTypeId &&
    !!academicYearId &&
    !!startDate &&
    !!endDate &&
    durationCheck?.kind !== "error" &&
    weekdays.length > 0 &&
    (!!organizationId || !!areaId) &&
    (mode === "single"
      ? !!singleStudentId
      : !!groupId && selectedStudentIds.size > 0);

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const allGroupSelected =
    groupStudents.length > 0 && groupStudents.every((s) => selectedStudentIds.has(s.id));

  const toggleAllGroup = () => {
    setSelectedStudentIds(
      allGroupSelected ? new Set() : new Set(groupStudents.map((s) => s.id)),
    );
  };

  const studentName = (id: string) =>
    groupStudents.find((s) => s.id === id)?.full_name ?? id.slice(0, 8);

  const handleSubmit = async () => {
    const base = {
      practice_type_id: practiceTypeId,
      academic_year_id: academicYearId,
      organization_id: organizationId || null,
      area_id: areaId || null,
      supervisor_id: supervisorId || null,
      start_date: startDate,
      end_date: endDate,
      semester: semester === NONE ? null : (semester as Semester),
      required_weekdays: weekdays,
      notes: notes || null,
    };

    try {
      if (mode === "single") {
        await createOne.mutateAsync({ ...base, student_id: singleStudentId });
        toast.success(t("assignmentsAssignmentWizard.createdSingle"));
        handleClose();
      } else {
        const res = await createBulk.mutateAsync({
          ...base,
          student_ids: Array.from(selectedStudentIds),
        });
        if (res.failed.length === 0) {
          toast.success(
            t("assignmentsAssignmentWizard.createdCount", { n: res.created }),
          );
          handleClose();
        } else {
          toast.warning(
            t("assignmentsAssignmentWizard.bulkPartial", {
              created: res.created,
              requested: res.requested,
              failed: res.failed.length,
            }),
          );
        }
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("assignmentsAssignmentWizard.errorOccurred"),
      );
    }
  };

  const busy = createOne.isPending || createBulk.isPending;

  // Faqat faol amaliyot turlari
  const availablePracticeTypes = (practiceTypes.data ?? []).filter((p) => p.is_active);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("assignmentsAssignmentWizard.title")}</DialogTitle>
          <DialogDescription>
            {t("assignmentsAssignmentWizard.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Practice type + academic year */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="wizard-practice-type">{t("common.practiceType")} *</Label>
              <Select value={practiceTypeId} onValueChange={handlePracticeTypeChange}>
                <SelectTrigger id="wizard-practice-type" className="mt-1.5">
                  <SelectValue placeholder={t("assignmentsAssignmentWizard.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {availablePracticeTypes.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="wizard-academic-year">{t("common.academicYear")} *</Label>
              <Select value={academicYearId} onValueChange={setAcademicYearId}>
                <SelectTrigger id="wizard-academic-year" className="mt-1.5">
                  <SelectValue placeholder={t("assignmentsAssignmentWizard.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(academicYears.data ?? []).map((ay) => (
                    <SelectItem key={ay.id} value={ay.id}>
                      {ay.name}
                      {ay.is_active && t("common.activeSuffix")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {practiceType && (
            <Alert variant="info">
              <AlertTitle className="text-sm">{practiceType.name}</AlertTitle>
              <AlertDescription className="mt-1 text-xs">
                {t("assignmentsAssignmentWizard.typeInfo", {
                  min: practiceType.min_weeks,
                  max: practiceType.max_weeks,
                  courses: practiceType.allowed_courses.join(", "),
                  object:
                    practiceType.object_kind === "organization"
                      ? t("assignmentsAssignmentWizard.objectKindOrganization")
                      : practiceType.object_kind === "area"
                        ? t("assignmentsAssignmentWizard.objectKindArea")
                        : t("assignmentsAssignmentWizard.objectKindBoth"),
                  contract: practiceType.requires_contract
                    ? t("assignmentsAssignmentWizard.contractRequired")
                    : t("assignmentsAssignmentWizard.contractNone"),
                })}
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Mode: single or group */}
          <div>
            <Label>{t("assignmentsAssignmentWizard.whoLabel")}</Label>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-1.5">
              <TabsList>
                <TabsTrigger value="single">
                  {t("assignmentsAssignmentWizard.modeSingle")}
                </TabsTrigger>
                <TabsTrigger value="group">
                  {t("assignmentsAssignmentWizard.modeGroup")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Bo'sh guruh holati */}
          {mode === "group" && groupId && groupStudents.length === 0 && groupStudentsQuery.isSuccess && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("assignmentsAssignmentWizard.emptyGroupTitle")}</AlertTitle>
              <AlertDescription>
                {t("assignmentsAssignmentWizard.emptyGroupDesc")}
              </AlertDescription>
            </Alert>
          )}

          {mode === "single" ? (
            <div>
              <Label>{t("common.student")} *</Label>
              <div className="mt-1.5">
                <StudentSearchSelect
                  value={singleStudentId}
                  onValueChange={setSingleStudentId}
                  allowedCourses={allowedCourses}
                  placeholder={t("assignmentsAssignmentWizard.studentPlaceholder")}
                />
              </div>
              {allowedCourses.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("assignmentsAssignmentWizard.courseFilterHint", {
                    courses: allowedCourses.join(", "),
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>{t("common.group")} *</Label>
                <div className="mt-1.5">
                  <GroupSearchSelect
                    value={groupId}
                    onValueChange={handleGroupChange}
                    allowedCourses={allowedCourses}
                    placeholder={t("assignmentsAssignmentWizard.groupPlaceholder")}
                  />
                </div>
              </div>
              {groupId && (
                <div className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {t("assignmentsAssignmentWizard.groupSelected", {
                        n: groupStudents.length,
                      })}{" "}
                      <strong>{selectedStudentIds.size}</strong>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={toggleAllGroup}
                      disabled={groupStudents.length === 0}
                    >
                      {allGroupSelected
                        ? t("assignmentsAssignmentWizard.deselectAll")
                        : t("assignmentsAssignmentWizard.selectAll")}
                    </Button>
                  </div>
                  {groupStudentsQuery.isPending ? (
                    <div className="flex h-16 items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {groupStudents.map((s) => (
                        <label
                          key={s.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.has(s.id)}
                            onChange={() => toggleStudent(s.id)}
                            className="h-4 w-4"
                          />
                          <span className="min-w-0 flex-1 truncate">{s.full_name}</span>
                          <span className="text-xs text-muted-foreground">{s.hemis_id}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Obyekt */}
          {practiceType && (
            <div>
              <Label>
                {t("assignmentsAssignmentWizard.objectLabel")} *{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (
                  {practiceType.object_kind === "organization"
                    ? t("assignmentsAssignmentWizard.objectKindOrganization")
                    : practiceType.object_kind === "area"
                      ? t("assignmentsAssignmentWizard.objectKindArea")
                      : t("assignmentsAssignmentWizard.objectKindEither")}
                  )
                </span>
              </Label>
              <div className="mt-1.5 grid gap-3 md:grid-cols-2">
                {practiceType.object_kind !== "area" && (
                  <OrganizationSearchSelect
                    value={organizationId}
                    onValueChange={(v) => {
                      setOrganizationId(v);
                      setSupervisorId("");
                      if (v) setAreaId("");
                    }}
                    placeholder={t("assignmentsAssignmentWizard.orgPlaceholder")}
                  />
                )}
                {practiceType.object_kind !== "organization" && (
                  <AreaSearchSelect
                    value={areaId}
                    onValueChange={(v) => {
                      setAreaId(v);
                      if (v) setOrganizationId("");
                    }}
                    placeholder={t("assignmentsAssignmentWizard.areaPlaceholder")}
                  />
                )}
              </div>
            </div>
          )}

          {/* Supervizor — tashkilot yoki hudud tanlangan bo'lsa */}
          {(organizationId || areaId) && (
            <div>
              <Label>{t("common.supervisor")}</Label>
              <div className="mt-1.5">
                <SupervisorSearchSelect
                  value={supervisorId}
                  onValueChange={setSupervisorId}
                  organizationId={organizationId}
                  placeholder={t("assignmentsAssignmentWizard.supervisorPlaceholder")}
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Sanalar */}
          <div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="start_date">{t("assignmentsAssignmentWizard.startDate")} *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="end_date">{t("assignmentsAssignmentWizard.endDate")} *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  aria-invalid={durationCheck?.kind === "error"}
                  aria-describedby={durationCheck ? "wizard-duration-check" : undefined}
                  className="mt-1.5"
                />
              </div>
            </div>
            {durationCheck ? (
              <p
                id="wizard-duration-check"
                role={durationCheck.kind === "error" ? "alert" : undefined}
                className={
                  durationCheck.kind === "error"
                    ? "mt-1.5 text-xs text-destructive"
                    : "mt-1.5 text-xs text-amber-600 dark:text-amber-500"
                }
              >
                {durationCheck.message}
              </p>
            ) : (
              practiceType &&
              !endTouched &&
              endDate && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t("assignmentsAssignmentWizard.endSuggested", {
                    weeks: practiceType.min_weeks,
                  })}
                </p>
              )
            )}
          </div>

          {/* Semestr — 4+2 da kuzgi va bahorgi baho alohida chiqadi */}
          <div>
            <Label htmlFor="wizard-semester">{t("common.semester")}</Label>
            <Select
              value={semester}
              onValueChange={(v) => {
                setSemester(v);
                setSemesterTouched(true);
              }}
            >
              <SelectTrigger id="wizard-semester" className="mt-1.5">
                <SelectValue placeholder={t("assignmentsAssignmentWizard.choosePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  {t("assignmentsAssignmentWizard.semesterNone")}
                </SelectItem>
                {SEMESTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("assignmentsAssignmentWizard.semesterHint")}
            </p>
          </div>

          {/* Majburiy kunlar — davomat foizi maxraji shu kunlardan hisoblanadi */}
          <div>
            <Label>{t("assignmentsAssignmentWizard.weekdaysLabel")} *</Label>
            <div className="mt-1.5">
              <WeekdayPicker value={weekdays} onChange={setWeekdays} disabled={busy} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("assignmentsAssignmentWizard.weekdaysHint")}
              {practiceType?.days_per_week
                ? " " +
                  t("assignmentsAssignmentWizard.weekdaysRecommend", {
                    name: practiceType.name,
                    days: practiceType.days_per_week,
                  })
                : ""}
            </p>
            {!!practiceType?.days_per_week &&
              weekdays.length > 0 &&
              weekdays.length !== practiceType.days_per_week && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                  {t("assignmentsAssignmentWizard.weekdaysMismatch", {
                    selected: weekdays.length,
                    expected: practiceType.days_per_week,
                  })}
                </p>
              )}
          </div>

          <div>
            <Label htmlFor="notes">{t("common.note")}</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5"
              placeholder={t("assignmentsAssignmentWizard.notesPlaceholder")}
            />
          </div>

          {/* Ommaviy natija (xatolar bo'lsa) */}
          {createBulk.data && createBulk.data.failed.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("assignmentsAssignmentWizard.bulkFailedTitle")}</AlertTitle>
              <AlertDescription>
                <div className="mt-2 max-h-40 overflow-y-auto text-xs">
                  {createBulk.data.failed.map((f) => (
                    <div key={f.student_id} className="mb-1">
                      <span className="font-medium">{studentName(f.student_id)}</span>:{" "}
                      {f.error}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {createBulk.data && createBulk.data.created > 0 && (
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>
                {t("assignmentsAssignmentWizard.createdCount", {
                  n: createBulk.data.created,
                })}
              </AlertTitle>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={busy}>
            {createBulk.data ? t("common.close") : t("common.cancel")}
          </Button>
          {!createBulk.data?.created && (
            <Button onClick={handleSubmit} disabled={!canSubmit || busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("assignmentsAssignmentWizard.createButton")}
              {mode === "group" && selectedStudentIds.size > 0 && (
                <span className="ml-1 opacity-80">({selectedStudentIds.size})</span>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
