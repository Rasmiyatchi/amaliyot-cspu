import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Filter,
  Inbox,
  Info,
  Loader2,
  Trophy,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { StatCard } from "@/components/admin/stat-card";
import {
  formatTashkentDate,
  formatTashkentTime,
} from "@/components/attendance/attendance-date-utils";
import { OverdueTasksCard } from "@/components/overdue-tasks-card";
import { SupervisorReviewPanel } from "@/components/supervisor/review-panel";
import { StudentPicker } from "@/components/supervisor/student-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/loading-skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dateLocale } from "@/i18n";
import { useAcademicYears } from "@/lib/api/academic";
import { useAttendanceDays, type AttendanceFilters } from "@/lib/api/attendance";
import { useMyAssignments } from "@/lib/api/assignments";
import { useSupervisorStats } from "@/lib/api/stats";
import { downloadSupervisorReport } from "@/lib/api/supervisor-report";
import type { AttendanceDay, Semester, UUID } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

/** O'quv yili filtri: faol yil (server default) | barcha yillar (`all` — backend sentineli) | UUID */
const ACTIVE_YEAR = "active";
const ALL_YEARS = "all";
const ALL_SEMESTERS = "__all__";
const ATTENDANCE_PAGE_SIZE = 20;
const STUDENT_PARAM = "student";

function durationParts(inTime: string | null, outTime: string | null) {
  if (!inTime || !outTime) return null;
  const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return null;
  const totalMins = Math.floor(diffMs / 60_000);
  return { hours: Math.floor(totalMins / 60), mins: totalMins % 60 };
}

function DayRow({ day }: { day: AttendanceDay }) {
  const { t } = useTranslation();
  const locale = dateLocale();
  const duration = durationParts(day.check_in_at, day.check_out_at);

  return (
    <div className="rounded-lg border border-border/80 bg-card p-3 shadow-xs transition-colors hover:border-border">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2">
            <span className="truncate font-semibold text-foreground">
              {day.student_full_name ?? "—"}
            </span>
            {day.student_hemis_id && (
              <span className="font-mono text-xs text-muted-foreground">
                ({day.student_hemis_id})
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">
              {formatTashkentDate(day.date, locale)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatTashkentTime(day.check_in_at, locale)} —{" "}
              {formatTashkentTime(day.check_out_at, locale)}
            </span>
            {duration && (
              <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                {duration.hours > 0
                  ? `${duration.hours} ${t("common.hours")} ${duration.mins} ${t("common.minutes")}`
                  : `${duration.mins} ${t("common.minutes")}`}
              </span>
            )}
            {day.note && (
              <span className="max-w-xs truncate italic text-muted-foreground/90">{day.note}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 self-start sm:self-center">
          <AttendanceStatusBadge status={day.status} />
        </div>
      </div>
    </div>
  );
}

export function SupervisorDashboard() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const { data: academicYears } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState<string>(ACTIVE_YEAR);
  const [semester, setSemester] = useState<string>(ALL_SEMESTERS);

  const semesterFilter: Semester | undefined =
    semester === "fall" || semester === "spring" ? semester : undefined;

  const assignmentFilters = useMemo(
    () => ({
      academic_year_id: academicYearId === ACTIVE_YEAR ? undefined : academicYearId,
      semester: semesterFilter,
    }),
    [academicYearId, semesterFilter],
  );

  const {
    data: assignments,
    isPending: assignmentsPending,
    error: assignmentsError,
  } = useMyAssignments(assignmentFilters);
  const { data: supervisorStats } = useSupervisorStats(assignmentFilters);

  const isAttendanceRoute = location.pathname.endsWith("/attendance");
  const isTasksRoute = location.pathname.endsWith("/tasks");
  const showAttendance = !isTasksRoute;
  const showTasks = !isAttendanceRoute;

  // Tanlangan talaba URL'da (?student=) — sahifa yangilansa ham saqlanadi
  const studentParam = searchParams.get(STUDENT_PARAM);
  const selectedAssignment = assignments?.find((a) => a.id === studentParam) ?? null;
  const selectedId: UUID | null = selectedAssignment?.id ?? null;

  const selectStudent = (id: UUID | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set(STUDENT_PARAM, id);
        else next.delete(STUDENT_PARAM);
        return next;
      },
      { replace: true },
    );
  };

  // ─── Hisobot PDF — ekrandagi yil/semestr bilan ───────────
  const [downloadingReport, setDownloadingReport] = useState(false);

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    try {
      await downloadSupervisorReport({
        academic_year_id: academicYearId === ACTIVE_YEAR ? undefined : academicYearId,
        semester: semesterFilter,
      });
      toast.success(t("supervisor.reportDownloaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setDownloadingReport(false);
    }
  };

  // ─── Davomat ro'yxati: server sahifalash ────────────────
  // Server supervizor talabalari bilan cheklaydi; yil/semestr — biriktirish bo'yicha aniq filtr
  // (ilgari sana oralig'i bilan taxminlanardi va boshqa yil/semestr kunlari ham chiqardi).
  const activeYearId = academicYears?.find((y) => y.is_active)?.id;
  const attendanceFilters = useMemo<AttendanceFilters>(() => {
    if (selectedId) return { assignment_id: selectedId };
    const yearId =
      academicYearId === ALL_YEARS
        ? undefined
        : academicYearId === ACTIVE_YEAR
          ? activeYearId
          : academicYearId;
    return { academic_year_id: yearId, semester: semesterFilter };
  }, [selectedId, academicYearId, activeYearId, semesterFilter]);

  const filterKey = JSON.stringify(attendanceFilters);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });

  const hasAssignments = !!assignments && assignments.length > 0;
  const {
    data: days,
    isPending: daysPending,
    isFetching: daysFetching,
    error: daysError,
  } = useAttendanceDays(attendanceFilters, page, ATTENDANCE_PAGE_SIZE, {
    enabled: showAttendance && hasAssignments,
  });

  // Filtrga kirmagan (boshqa yil/semestr) biriktirishlar kunlari ko'rinmasin
  const myAssignmentIds = useMemo(
    () => new Set(assignments?.map((a) => a.id) ?? []),
    [assignments],
  );
  const visibleDays = useMemo(
    () => (days?.items ?? []).filter((d) => myAssignmentIds.has(d.assignment_id)),
    [days, myAssignmentIds],
  );
  const totalDays = days?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(totalDays / ATTENDANCE_PAGE_SIZE));
  const rangeFrom = totalDays === 0 ? 0 : (page - 1) * ATTENDANCE_PAGE_SIZE + 1;
  const rangeTo = Math.min(page * ATTENDANCE_PAGE_SIZE, totalDays);

  // Banner: barcha biriktirishlar bitta amaliyot turida bo'lsa — o'sha nom, aks holda umumiy
  const practiceTypeNames = useMemo(
    () => [...new Set((assignments ?? []).map((a) => a.practice_type_name).filter(Boolean))],
    [assignments],
  );
  const kicker =
    practiceTypeNames.length === 1 && practiceTypeNames[0]
      ? t("supervisor.kickerWithType", {
          type: practiceTypeNames[0].toLocaleUpperCase(dateLocale()),
        })
      : t("supervisor.kicker");

  const resetSelection = () => selectStudent(null);

  return (
    <div className="container mx-auto overflow-x-hidden px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
        <section className="dash-welcome">
          <div className="min-w-0">
            <span>{kicker}</span>
            <h2>{t("supervisor.welcome", { name: user?.first_name })}</h2>
            <p>
              {isTasksRoute
                ? t("supervisorSupervisorSidebar.nav.tasks")
                : isAttendanceRoute
                  ? t("supervisorSupervisorSidebar.nav.attendance")
                  : t("supervisor.subtitle")}
            </p>
          </div>
          <div className="progress-score shrink-0">
            <strong>{assignments?.length ?? 0}</strong>
            <span>{t("supervisor.assignedStudentsLabel")}</span>
          </div>
        </section>

        {/* O'quv yili va semestr filtri */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold">{t("common.filter")}</span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Select
              value={academicYearId}
              onValueChange={(v) => {
                setAcademicYearId(v);
                resetSelection();
              }}
            >
              <SelectTrigger
                className="h-9 w-[180px] max-w-full"
                aria-label={t("common.academicYear")}
              >
                <SelectValue placeholder={t("common.academicYear")} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value={ACTIVE_YEAR}>
                  {t("supervisorStudents.currentActiveYear")}
                </SelectItem>
                <SelectItem value={ALL_YEARS}>{t("common.allYears")}</SelectItem>
                {(academicYears ?? []).map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                    {y.is_active ? ` (${t("supervisorStudents.activeSuffix")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={semester}
              onValueChange={(v) => {
                setSemester(v);
                resetSelection();
              }}
            >
              <SelectTrigger className="h-9 w-[170px] max-w-full" aria-label={t("common.semester")}>
                <SelectValue placeholder={t("common.semester")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SEMESTERS}>{t("supervisorStudents.semesters.all")}</SelectItem>
                <SelectItem value="fall">{t("supervisorStudents.semesters.fall")}</SelectItem>
                <SelectItem value="spring">{t("supervisorStudents.semesters.spring")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {assignmentsPending && (
          <div className="flex h-32 items-center justify-center">
            <Loader2
              className="h-5 w-5 animate-spin text-muted-foreground"
              aria-label={t("common.loading")}
            />
          </div>
        )}

        {assignmentsError && (
          <Alert variant="destructive">
            <AlertDescription>{assignmentsError.message}</AlertDescription>
          </Alert>
        )}

        {assignments && assignments.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={Users}
                title={t("supervisor.noStudentsTitle")}
                description={t("supervisor.noStudentsDesc")}
              />
            </CardContent>
          </Card>
        )}

        {assignments && assignments.length > 0 && (
          <>
            {supervisorStats && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label={t("common.students")}
                  value={supervisorStats.assignments_total}
                  icon={Users}
                  accent="primary"
                />
                <StatCard
                  label={t("supervisor.todayCheckin")}
                  value={
                    (supervisorStats.today.green ?? 0) + (supervisorStats.today.pending ?? 0)
                  }
                  icon={CalendarCheck}
                  accent="info"
                  hint={t("supervisor.todayHint", {
                    green: supervisorStats.today.green ?? 0,
                    pending: supervisorStats.today.pending ?? 0,
                  })}
                />
                {/* Faqat rahbar o'zi bajara oladigan ishlar: topshiriq, kundalik, dars tahlili.
                    Davomatni tasdiqlash Super Admin vakolatida — u bu yerda sanalmaydi. */}
                <StatCard
                  label={t("supervisor.pendingReviews")}
                  value={supervisorStats.pending_reviews.total}
                  icon={Inbox}
                  accent={supervisorStats.pending_reviews.total > 0 ? "warning" : "success"}
                  hint={t("supervisor.pendingReviewsHint", {
                    tasks: supervisorStats.pending_reviews.tasks,
                    journals: supervisorStats.pending_reviews.journals,
                    analyses: supervisorStats.pending_reviews.analyses,
                  })}
                />
                <StatCard
                  label={t("supervisor.pointsTotal")}
                  value={`${supervisorStats.points_earned} / ${supervisorStats.points_max}`}
                  icon={Trophy}
                  accent="success"
                />
              </div>
            )}

            {showTasks && <OverdueTasksCard />}

            {/* Talaba tanlash (qidiruv bilan) + hisobot */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <StudentPicker
                assignments={assignments}
                value={selectedId}
                onChange={selectStudent}
                className="sm:max-w-md sm:flex-1"
              />
              <div className="flex flex-col gap-1 sm:ml-auto sm:items-end">
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={handleDownloadReport}
                  disabled={downloadingReport}
                  title={t("supervisor.reportTooltip")}
                >
                  {downloadingReport ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {t("supervisor.reportPdf")}
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Talabalar davomati (faqat ko'rish) */}
            {showAttendance && (
              <Card>
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>
                        {t("supervisorSupervisorSidebar.nav.attendance")}
                        {days ? ` (${totalDays})` : ""}
                      </span>
                    </CardTitle>
                    <span className="rounded bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                      {t("supervisor.readOnly")}
                    </span>
                  </div>
                  {supervisorStats && supervisorStats.pending_attendance > 0 && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {t("supervisor.attendancePendingInfo", {
                        count: supervisorStats.pending_attendance,
                      })}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {daysPending ? (
                    <ListSkeleton count={4} />
                  ) : daysError ? (
                    <Alert variant="destructive">
                      <AlertDescription>{daysError.message}</AlertDescription>
                    </Alert>
                  ) : visibleDays.length === 0 ? (
                    <EmptyState
                      icon={CalendarCheck}
                      title={t("supervisor.noAttendanceTitle")}
                      description={t("supervisor.noAttendanceDesc")}
                      compact
                    />
                  ) : (
                    <div
                      className={daysFetching ? "space-y-2 opacity-60 transition-opacity" : "space-y-2"}
                      aria-busy={daysFetching}
                    >
                      {visibleDays.map((d) => (
                        <DayRow key={d.id} day={d} />
                      ))}
                    </div>
                  )}

                  {totalDays > ATTENDANCE_PAGE_SIZE && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {t("supervisor.pageRange", {
                          from: rangeFrom,
                          to: rangeTo,
                          total: totalDays,
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={page <= 1 || daysFetching}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          {t("common.previous")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page + 1)}
                          disabled={page >= lastPage || daysFetching}
                        >
                          {t("common.next")}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Topshiriq / kundalik / dars tahlili — tanlangan talaba bo'yicha */}
            {showTasks &&
              (selectedId ? (
                <SupervisorReviewPanel key={selectedId} assignmentId={selectedId} />
              ) : assignments.length === 1 && assignments[0] ? (
                <SupervisorReviewPanel key={assignments[0].id} assignmentId={assignments[0].id} />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <ClipboardCheck
                      className="mx-auto mb-2 h-8 w-8 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium">{t("supervisor.reviewPromptTitle")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("supervisor.reviewPromptDesc")}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
