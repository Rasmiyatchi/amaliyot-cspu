import {
  CalendarCheck,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Filter,
  Inbox,
  Loader2,
  Trophy,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { downloadSupervisorReport } from "@/lib/api/supervisor-report";
import { OverdueTasksCard } from "@/components/overdue-tasks-card";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { NotificationsBell } from "@/components/notifications-bell";
import { SupervisorReviewPanel } from "@/components/supervisor/review-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dateLocale } from "@/i18n";
import { useAcademicYears } from "@/lib/api/academic";
import { useAttendanceDays } from "@/lib/api/attendance";
import { useMyAssignments } from "@/lib/api/assignments";
import { useSupervisorStats } from "@/lib/api/stats";
import type { AttendanceDay, Semester, UUID } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

const ALL = "__all__";

const fmtTime = (s: string | null) =>
  s
    ? new Date(s).toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })
    : "—";

const fmtDuration = (
  inTime: string | null,
  outTime: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
) => {
  if (!inTime || !outTime) return null;
  const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
  if (diffMs <= 0) return null;
  const totalMins = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const hLabel = t("common.hours", { defaultValue: "soat" });
  const mLabel = t("common.minutes", { defaultValue: "daqiqa" });
  if (hours > 0) return `${hours} ${hLabel} ${mins} ${mLabel}`;
  return `${mins} ${mLabel}`;
};

type DayRowProps = {
  day: AttendanceDay;
};

function DayRow({ day }: DayRowProps) {
  const { t } = useTranslation();
  const duration = fmtDuration(day.check_in_at, day.check_out_at, t);

  return (
    <div className="rounded-lg border border-border/80 bg-card p-3 shadow-xs hover:border-border transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground truncate">
              {day.student_full_name ?? "—"}
            </span>
            {day.student_hemis_id && (
              <span className="text-xs text-muted-foreground font-mono">
                ({day.student_hemis_id})
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{day.date}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {fmtTime(day.check_in_at)} — {fmtTime(day.check_out_at)}
            </span>
            {duration && (
              <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                {duration}
              </span>
            )}
            {day.note && (
              <span className="italic text-muted-foreground/90 truncate max-w-xs">
                {day.note}
              </span>
            )}
          </div>
        </div>
        <div className="self-start sm:self-center shrink-0">
          <AttendanceStatusBadge status={day.status} />
        </div>
      </div>
    </div>
  );
}

export function SupervisorDashboard() {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const { data: academicYears } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState<string>("active");
  const [semester, setSemester] = useState<string>(ALL);

  const assignmentFilters = useMemo(
    () => ({
      academic_year_id: academicYearId === "active" ? undefined : academicYearId,
      semester: semester === ALL ? undefined : (semester as Semester),
    }),
    [academicYearId, semester],
  );

  const { data: assignments, isPending: assignmentsPending } = useMyAssignments(assignmentFilters);
  const { data: supervisorStats } = useSupervisorStats(assignmentFilters);

  const isAttendanceRoute = location.pathname.endsWith("/attendance");
  const isTasksRoute = location.pathname.endsWith("/tasks");

  const showAttendance = isAttendanceRoute || (!isTasksRoute && !isAttendanceRoute);
  const showTasks = isTasksRoute || (!isAttendanceRoute && !isTasksRoute);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<UUID | "all">(
    "all",
  );
  const [downloadingReport, setDownloadingReport] = useState(false);

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    try {
      await downloadSupervisorReport();
      toast.success(t("supervisor.reportDownloaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setDownloadingReport(false);
    }
  };

  // Bugungi va oxirgi kunlar davomatini tortish
  const assignmentFilter = selectedAssignmentId === "all" ? undefined : selectedAssignmentId;
  const { data: days, isPending: daysPending } = useAttendanceDays(
    { assignment_id: assignmentFilter },
    1,
    100,
  );

  // Faqat o'z assignmentlariga tegishli kunlarni ko'rsatish (xavfsizlik)
  const myAssignmentIds = useMemo(
    () => new Set(assignments?.map((a) => a.id) ?? []),
    [assignments],
  );
  const visibleDays = useMemo(
    () => (days?.items ?? []).filter((d) => myAssignmentIds.has(d.assignment_id)),
    [days, myAssignmentIds],
  );

  return (
    <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 overflow-x-hidden">
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 sm:p-6 text-white shadow-lg dark:from-blue-800 dark:to-indigo-900">
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">
                {t("supervisor.welcome", { name: user?.first_name })}
              </h2>
              <p className="mt-0.5 text-sm text-blue-50">
                {isTasksRoute
                  ? t("supervisorSupervisorSidebar.nav.tasks")
                  : isAttendanceRoute
                    ? t("supervisorSupervisorSidebar.nav.attendance")
                    : t("supervisor.subtitle")}
              </p>
            </div>
            <div className="shrink-0 [&_button]:text-white [&_button]:hover:bg-white/10">
              <NotificationsBell />
            </div>
          </div>
        </div>

        {/* Period Selector (Semestr va O'quv yili filtri) */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{t("common.filter", { defaultValue: "Filtrlash:" })}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={academicYearId}
              onValueChange={(v) => {
                setAcademicYearId(v);
                setSelectedAssignmentId("all");
              }}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder={t("common.academicYear", { defaultValue: "O'quv yili" })} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="active">
                  {t("supervisorStudents.activeYear", { defaultValue: "Faol o'quv yili" })}
                </SelectItem>
                <SelectItem value="all">
                  {t("common.allYears", { defaultValue: "Barcha yillar" })}
                </SelectItem>
                {(academicYears ?? []).map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name} {y.is_active ? `(${t("common.active", { defaultValue: "Faol" })})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={semester}
              onValueChange={(v) => {
                setSemester(v);
                setSelectedAssignmentId("all");
              }}
            >
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder={t("common.semester", { defaultValue: "Semestr" })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t("supervisorStudents.semesters.all", { defaultValue: "Barcha semestrlar" })}
                </SelectItem>
                <SelectItem value="fall">
                  {t("common.semesterFall", { defaultValue: "1-semestr (Kuzgi)" })}
                </SelectItem>
                <SelectItem value="spring">
                  {t("common.semesterSpring", { defaultValue: "2-semestr (Bahorgi)" })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {assignmentsPending && (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!assignmentsPending && (!assignments || assignments.length === 0) && (
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
            {/* KPI summary */}
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
                    (supervisorStats.today.green ?? 0) +
                    (supervisorStats.today.pending ?? 0)
                  }
                  icon={CalendarCheck}
                  accent="info"
                  hint={t("supervisor.todayHint", {
                    green: supervisorStats.today.green,
                    pending: supervisorStats.today.pending,
                  })}
                />
                <StatCard
                  label={t("supervisor.pendingReviews")}
                  value={supervisorStats.pending_reviews.total}
                  icon={Inbox}
                  accent={supervisorStats.pending_reviews.total > 0 ? "warning" : "success"}
                  hint={t("supervisor.pendingHint", {
                    attendance: supervisorStats.pending_attendance,
                    tasks: supervisorStats.pending_reviews.tasks,
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

            {/* Muddati o'tgan topshiriqlar (Faqat topshiriqlar ko'rinishida) */}
            {showTasks && <OverdueTasksCard />}

            {/* Assignment tanlov + hisobot */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={selectedAssignmentId === "all" ? "default" : "outline"}
                onClick={() => setSelectedAssignmentId("all")}
              >
                {t("common.all")} ({assignments.length})
              </Button>
              {assignments.map((a) => (
                <Button
                  key={a.id}
                  size="sm"
                  variant={selectedAssignmentId === a.id ? "default" : "outline"}
                  onClick={() => setSelectedAssignmentId(a.id)}
                >
                  {a.student_full_name}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
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

            {/* Talabalar davomati (Read-only) — Faqat Davomat ko'rinishida yoki Bosh sahifada */}
            {showAttendance && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarCheck className="h-4 w-4 text-primary" />
                      <span>{t("common.attendance")} ({visibleDays.length})</span>
                    </CardTitle>
                    <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                      Read-only
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {daysPending && (
                    <div className="flex h-16 items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!daysPending && visibleDays.length === 0 && (
                    <EmptyState
                      icon={CalendarCheck}
                      title={t("supervisor.noAttendanceTitle")}
                      description={t("supervisor.noAttendanceDesc")}
                      compact
                    />
                  )}
                  {!daysPending && visibleDays.length > 0 && (
                    <div className="space-y-2">
                      {visibleDays.map((d) => (
                        <DayRow key={d.id} day={d} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tasks / Journal / Analyses — Faqat Topshiriqlar ko'rinishida yoki Bosh sahifada */}
            {showTasks && (
              <>
                {selectedAssignmentId !== "all" && (
                  <SupervisorReviewPanel assignmentId={selectedAssignmentId} />
                )}
                {selectedAssignmentId === "all" && assignments.length === 1 && assignments[0] && (
                  <SupervisorReviewPanel assignmentId={assignments[0].id} />
                )}
                {/* 2+ talaba bo'lsa "Barchasi" da panel yo'q — ko'rsatma beramiz */}
                {selectedAssignmentId === "all" && assignments.length > 1 && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {t("supervisor.reviewPromptTitle")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("supervisor.reviewPromptDesc")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
