import { HTTPError } from "ky";
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
import { SelectEmpty } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAcademicYears, useGroups } from "@/lib/api/academic";
import { useAreas } from "@/lib/api/areas";
import {
  useBulkCreateAssignment,
  useCreateAssignment,
} from "@/lib/api/assignments";
import { useOrganizations } from "@/lib/api/organizations";
import { usePracticeTypes } from "@/lib/api/practice-types";
import { useStudents } from "@/lib/api/students";
import { useSupervisors } from "@/lib/api/supervisors";
import type { PracticeType, Semester } from "@/lib/api/types";
import { WeekdayPicker } from "@/components/admin/assignments/weekday-picker";

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

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AssignmentWizard({ open, onClose }: Props) {
  const { t } = useTranslation();
  const practiceTypes = usePracticeTypes();
  const academicYears = useAcademicYears();
  const organizations = useOrganizations({ is_active: true }, 1, 100);
  const areas = useAreas({ is_active: true }, 1, 100);

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
  const [semester, setSemester] = useState<string>(NONE);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [notes, setNotes] = useState<string>("");

  const practiceType: PracticeType | undefined = useMemo(
    () => practiceTypes.data?.find((p) => p.id === practiceTypeId),
    [practiceTypes.data, practiceTypeId],
  );

  // Active AY'ni default qilamiz
  useEffect(() => {
    if (!academicYearId && academicYears.data?.length) {
      const active = academicYears.data.find((ay) => ay.is_active);
      if (active) setAcademicYearId(active.id);
    }
  }, [academicYears.data, academicYearId]);

  // Group tanlanganda — groupdagi talabalarni yuklash
  const groupStudentsQuery = useStudents({ group_id: groupId || undefined }, 1, 100);
  const groupStudents = groupStudentsQuery.data?.items ?? [];

  // Single mode uchun talabalar (kurs bo'yicha filter)
  const allowedCourses = useMemo(
    () => practiceType?.allowed_courses ?? [],
    [practiceType],
  );
  const allStudentsQuery = useStudents(
    {
      course: allowedCourses.length === 1 ? allowedCourses[0] : undefined,
    },
    1,
    100,
  );
  const allStudents = allStudentsQuery.data?.items ?? [];
  const studentsForSingle = allowedCourses.length
    ? allStudents.filter((s) => s.course && allowedCourses.includes(s.course))
    : allStudents;

  // Supervisorlar: tashkilot tanlansa — o'sha tashkilotdagilar + tashkilotga
  // bog'lanmaganlar (import qilinganlar odatda tashkilotsiz keladi; backend ham
  // ularni istalgan tashkilotga biriktirishga ruxsat beradi). Hudud (area) uchun
  // esa filtr yo'q — barcha faol supervizorlar.
  const supervisorsQuery = useSupervisors(
    {
      organization_id: organizationId || undefined,
      include_unassigned: true,
      is_active: true,
    },
    1,
    200,
  );

  // Guruhlarni ruxsat etilgan kurslar bo'yicha filter
  const allGroupsQuery = useGroups({}, 1, 100);
  const filteredGroups = useMemo(() => {
    const items = allGroupsQuery.data?.items ?? [];
    if (!allowedCourses.length) return items;
    return items.filter((g) => allowedCourses.includes(g.course));
  }, [allGroupsQuery.data, allowedCourses]);

  // Amaliyot turi o'zgarganda — end_date avto-taklif
  useEffect(() => {
    if (startDate && practiceType) {
      setEndDate(addDays(startDate, practiceType.min_weeks * 7));
    }
  }, [startDate, practiceType]);

  // Semestr — boshlanish oyidan avto-taklif. Backend ham shu qoidani ishlatadi
  // (task.py:_semester_for_date): 8-oy va undan keyin — kuzgi, aks holda bahorgi.
  useEffect(() => {
    if (!startDate) return;
    const month = Number(startDate.slice(5, 7));
    setSemester(month >= 8 ? "fall" : "spring");
  }, [startDate]);

  // Amaliyot turi o'zgarganda — obyektni reset
  useEffect(() => {
    setOrganizationId("");
    setAreaId("");
    setSupervisorId("");
  }, [practiceTypeId]);

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
    setSemester(NONE);
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

  const selectAllGroup = () => {
    setSelectedStudentIds(new Set(groupStudents.map((s) => s.id)));
  };

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
        e instanceof HTTPError
          ? e.message
          : t("assignmentsAssignmentWizard.errorOccurred"),
      );
    }
  };

  const busy = createOne.isPending || createBulk.isPending;

  // Show only compatible practice types (active)
  const availablePracticeTypes = (practiceTypes.data ?? []).filter((p) => p.is_active);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
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
              <Label>{t("common.practiceType")} *</Label>
              <Select value={practiceTypeId} onValueChange={setPracticeTypeId}>
                <SelectTrigger className="mt-1.5">
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
              <Label>{t("common.academicYear")} *</Label>
              <Select value={academicYearId} onValueChange={setAcademicYearId}>
                <SelectTrigger className="mt-1.5">
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

          {/* Bo'sh groupStudents holati */}
          {mode === "group" && groupId && groupStudents.length === 0 && !groupStudentsQuery.isPending && (
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
              <Select value={singleStudentId} onValueChange={setSingleStudentId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t("assignmentsAssignmentWizard.studentPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {studentsForSingle.length === 0 ? (
                    <SelectEmpty
                      message={
                        allowedCourses.length
                          ? t("assignmentsAssignmentWizard.noCourseStudents", {
                              courses: allowedCourses.join(", "),
                            })
                          : t("assignmentsAssignmentWizard.noStudents")
                      }
                    />
                  ) : (
                    studentsForSingle.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} ({s.hemis_id}
                        {s.group_name ? ` · ${s.group_name}` : ""})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
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
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder={t("assignmentsAssignmentWizard.groupPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredGroups.length === 0 ? (
                      <SelectEmpty
                        message={
                          allowedCourses.length
                            ? t("assignmentsAssignmentWizard.noCourseGroups", {
                                courses: allowedCourses.join(", "),
                              })
                            : t("assignmentsAssignmentWizard.noGroups")
                        }
                      />
                    ) : (
                      filteredGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name} ({t("common.courseN", { n: g.course })})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {groupId && (
                <div className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
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
                      onClick={selectAllGroup}
                    >
                      {t("assignmentsAssignmentWizard.selectAll")}
                    </Button>
                  </div>
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
                        <span className="flex-1">{s.full_name}</span>
                        <span className="text-xs text-muted-foreground">{s.hemis_id}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Object selection */}
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
                  <Select
                    value={organizationId || NONE}
                    onValueChange={(v) => {
                      setOrganizationId(v === NONE ? "" : v);
                      if (v !== NONE) setAreaId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("assignmentsAssignmentWizard.orgPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(organizations.data?.items ?? []).length === 0 ? (
                        <SelectEmpty message={t("assignmentsAssignmentWizard.noOrganizations")} />
                      ) : (
                        (organizations.data?.items ?? []).map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                {practiceType.object_kind !== "organization" && (
                  <Select
                    value={areaId || NONE}
                    onValueChange={(v) => {
                      setAreaId(v === NONE ? "" : v);
                      if (v !== NONE) setOrganizationId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("assignmentsAssignmentWizard.areaPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(areas.data?.items ?? []).length === 0 ? (
                        <SelectEmpty message={t("assignmentsAssignmentWizard.noAreas")} />
                      ) : (
                        (areas.data?.items ?? []).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {/* Supervisor — tashkilot yoki hudud tanlangan bo'lsa */}
          {(organizationId || areaId) && (
            <div>
              <Label>{t("common.supervisor")}</Label>
              <Select
                value={supervisorId || NONE}
                onValueChange={(v) => setSupervisorId(v === NONE ? "" : v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t("assignmentsAssignmentWizard.supervisorPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {(supervisorsQuery.data?.items ?? []).length === 0 ? (
                    <SelectEmpty message={t("assignmentsAssignmentWizard.noActiveSupervisors")} />
                  ) : (
                    (supervisorsQuery.data?.items ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} ({s.position})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Dates */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="start_date">{t("assignmentsAssignmentWizard.startDate")} *</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="end_date">{t("assignmentsAssignmentWizard.endDate")} *</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Semestr — 4+2 da kuzgi va bahorgi baho alohida chiqadi */}
          <div>
            <Label>{t("common.semester")}</Label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="mt-1.5">
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

          {/* Bulk result (agar xatolar bo'lsa) */}
          {createBulk.data && createBulk.data.failed.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("assignmentsAssignmentWizard.bulkFailedTitle")}</AlertTitle>
              <AlertDescription>
                <div className="mt-2 max-h-40 overflow-y-auto text-xs">
                  {createBulk.data.failed.map((f, i) => (
                    <div key={i} className="mb-1">
                      <span className="font-mono">{f.student_id.slice(0, 8)}</span>:{" "}
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

