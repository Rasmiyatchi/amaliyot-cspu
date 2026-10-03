import { Inbox, Loader2, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { AssignmentStatusBadge } from "@/components/admin/assignments/assignment-status-badge";
import { GradePanel } from "@/components/admin/assignments/grade-panel";
import { formatTashkentDate } from "@/components/attendance/attendance-date-utils";
import { FinalReportStatusBadge } from "@/components/supervisor/final-report-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dateLocale } from "@/i18n";
import { useAcademicYears } from "@/lib/api/academic";
import { useMyAssignments } from "@/lib/api/assignments";
import { useFinalReports, type FinalReport } from "@/lib/api/final-reports";
import type { AssignmentStatus, PracticeAssignment, Semester, UUID } from "@/lib/api/types";

const ALL = "__all__";
/** O'quv yili filtri: faol yil (server default) | `all` (backend'ning hujjatlashtirilgan sentineli) | UUID */
const ACTIVE_YEAR = "active";
const ALL_YEARS = "all";

const STATUSES: { value: string; labelKey: string }[] = [
  { value: ALL, labelKey: "supervisorStudents.statuses.all" },
  { value: "active", labelKey: "supervisorStudents.statuses.active" },
  { value: "draft", labelKey: "supervisorStudents.statuses.draft" },
  { value: "completed", labelKey: "supervisorStudents.statuses.completed" },
  { value: "cancelled", labelKey: "supervisorStudents.statuses.cancelled" },
];

/** Qidiruv uchun: kichik harf, apostrof turlari farqsiz. */
function normalize(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/['`ʻʼ‘’"]/g, "")
    .trim();
}

/** Supervizorning "Talabalarim" sahifasi — guruh bo'yicha tartiblangan ro'yxat. */
export function SupervisorStudentsPage() {
  const { t } = useTranslation();
  const { data: academicYears } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState<string>(ACTIVE_YEAR);
  const [semester, setSemester] = useState<string>(ALL);

  const semesterFilter: Semester | undefined =
    semester === "fall" || semester === "spring" ? semester : undefined;

  const assignmentFilters = useMemo(
    () => ({
      // "active" — parametr yuborilmaydi (server faol yilni oladi); "all" — barcha yillar
      academic_year_id: academicYearId === ACTIVE_YEAR ? undefined : academicYearId,
      semester: semesterFilter,
    }),
    [academicYearId, semesterFilter],
  );

  const { data, isPending, error } = useMyAssignments(assignmentFilters);
  // Yakuniy hisobot holati (server supervizorning o'z talabalari bilan cheklaydi)
  const { data: reports } = useFinalReports(undefined, {
    academic_year_id:
      academicYearId === ACTIVE_YEAR || academicYearId === ALL_YEARS ? undefined : academicYearId,
  });
  const reportByAssignment = useMemo(() => {
    const map = new Map<UUID, FinalReport>();
    for (const r of reports ?? []) map.set(r.assignment_id, r);
    return map;
  }, [reports]);

  const [search, setSearch] = useState("");
  const [grading, setGrading] = useState<PracticeAssignment | null>(null);
  const [status, setStatus] = useState(ALL);

  const rows = useMemo(() => {
    const q = normalize(search);
    const items = (data ?? []).filter((a) => {
      if (status !== ALL && a.status !== (status as AssignmentStatus)) return false;
      if (q) {
        const hay = normalize(
          `${a.student_full_name ?? ""} ${a.student_hemis_id ?? ""} ${a.student_group_name ?? ""}`,
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Tartib: guruh → kurs → F.I.SH.
    return [...items].sort((a, b) => {
      const g = (a.student_group_name ?? "").localeCompare(b.student_group_name ?? "");
      if (g !== 0) return g;
      const c = (a.student_course ?? 0) - (b.student_course ?? 0);
      if (c !== 0) return c;
      return (a.student_full_name ?? "").localeCompare(b.student_full_name ?? "");
    });
  }, [data, search, status]);

  // Guruh bo'yicha guruhlash (tartiblangan ko'rinish)
  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = r.student_group_name ?? t("supervisorStudents.noGroup");
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [rows, t]);

  const locale = dateLocale();
  // Bekor qilingan amaliyotni baholab bo'lmaydi — faqat ko'rish
  const gradingReadOnly = grading?.status === "cancelled";

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">{t("supervisorStudents.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("supervisorStudents.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder={t("supervisorStudents.searchPlaceholderWithId")}
              aria-label={t("supervisorStudents.searchPlaceholderWithId")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Academic Year Filter */}
          <Select value={academicYearId} onValueChange={setAcademicYearId}>
            <SelectTrigger className="w-[180px] max-w-full" aria-label={t("supervisorStudents.academicYear")}>
              <SelectValue placeholder={t("supervisorStudents.academicYear")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ACTIVE_YEAR}>
                {t("supervisorStudents.currentActiveYear")}
              </SelectItem>
              <SelectItem value={ALL_YEARS}>{t("supervisorStudents.allYears")}</SelectItem>
              {(academicYears ?? []).map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                  {y.is_active ? ` (${t("supervisorStudents.activeSuffix")})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Semester Filter */}
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-[170px] max-w-full" aria-label={t("supervisorStudents.semesters.title")}>
              <SelectValue placeholder={t("supervisorStudents.semesters.title")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("supervisorStudents.semesters.all")}</SelectItem>
              <SelectItem value="fall">{t("supervisorStudents.semesters.fall")}</SelectItem>
              <SelectItem value="spring">{t("supervisorStudents.semesters.spring")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px] max-w-full" aria-label={t("common.status")}>
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || status !== ALL || academicYearId !== ACTIVE_YEAR || semester !== ALL) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setStatus(ALL);
                setAcademicYearId(ACTIVE_YEAR);
                setSemester(ALL);
              }}
            >
              {t("common.clear")}
            </Button>
          )}
        </div>

        {isPending && (
          <div className="flex h-24 items-center justify-center">
            <Loader2
              className="h-5 w-5 animate-spin text-muted-foreground"
              aria-label={t("common.loading")}
            />
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {data && rows.length === 0 && (
          <div className="rounded-lg border border-border">
            <EmptyState
              icon={Inbox}
              title={t("supervisorStudents.emptyTitle")}
              description={t("supervisorStudents.emptyDescription")}
            />
          </div>
        )}

        {data && rows.length > 0 && (
          <>
            <div className="text-sm text-muted-foreground">
              <Trans
                i18nKey="supervisorStudents.totalSummary"
                values={{ count: rows.length, groups: grouped.length }}
                components={[<span key="0" className="font-medium text-foreground" />]}
              />
            </div>
            {grouped.map(([group, items]) => (
              <div key={group} className="rounded-lg border border-border">
                <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2">
                  <span className="min-w-0 truncate font-medium">{group}</span>
                  <Badge variant="outline" className="shrink-0">
                    {t("supervisorStudents.countSuffix", { count: items.length })}
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">№</TableHead>
                      <TableHead>{t("common.student")}</TableHead>
                      <TableHead className="w-[70px]">{t("common.course")}</TableHead>
                      <TableHead>{t("common.practiceType")}</TableHead>
                      <TableHead>{t("supervisorStudents.table.object")}</TableHead>
                      <TableHead className="w-[180px]">
                        {t("supervisorStudents.table.period")}
                      </TableHead>
                      <TableHead className="w-[170px]">{t("common.status")}</TableHead>
                      <TableHead className="w-[80px]">
                        {t("supervisorStudents.table.grade")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((a, i) => {
                      const report = reportByAssignment.get(a.id);
                      return (
                        <TableRow
                          key={a.id}
                          onClick={() => setGrading(a)}
                          className="cursor-pointer"
                          title={t("supervisorStudents.rowClickHint")}
                        >
                          <TableCell className="text-sm text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell>
                            {/* Klaviatura bilan ham ochilsin — qator o'zi fokuslanmaydi */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGrading(a);
                              }}
                              className="rounded-sm text-left font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {a.student_full_name}
                            </button>
                            <div className="text-xs text-muted-foreground">
                              {a.student_hemis_id}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{a.student_course ?? "—"}</TableCell>
                          <TableCell className="text-sm">{a.practice_type_name}</TableCell>
                          <TableCell className="text-sm">
                            {a.organization_name ?? a.area_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {a.semester && (
                              <Badge variant="outline" className="mr-1 px-1 py-0 text-[10px]">
                                {t(`supervisorStudents.semesterShort.${a.semester}`)}
                              </Badge>
                            )}
                            {formatTashkentDate(a.start_date, locale)} —{" "}
                            {formatTashkentDate(a.end_date, locale)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <AssignmentStatusBadge status={a.status} />
                              {report && <FinalReportStatusBadge status={report.status} compact />}
                            </div>
                          </TableCell>
                          <TableCell>
                            {a.final_grade !== null && a.final_grade !== undefined ? (
                              <Badge variant={a.credit_earned ? "success" : "secondary"}>
                                {a.final_grade}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Baholash — 12.07 qarori: yakuniy bahoni biriktirilgan amaliyot rahbari qo'yadi */}
      <Dialog open={!!grading} onOpenChange={(o) => !o && setGrading(null)}>
        <DialogContent className="max-h-[92dvh] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-6">{grading?.student_full_name}</DialogTitle>
            <DialogDescription>
              {grading?.practice_type_name} ·{" "}
              {grading?.organization_name ?? grading?.area_name ?? "—"}
            </DialogDescription>
          </DialogHeader>
          {gradingReadOnly && (
            <Alert>
              <AlertDescription>{t("supervisorStudents.cancelledReadOnly")}</AlertDescription>
            </Alert>
          )}
          {grading && <GradePanel assignmentId={grading.id} readOnly={gradingReadOnly} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
