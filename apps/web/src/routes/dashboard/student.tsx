import { CalendarDays, GraduationCap, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { ArchiveCard } from "@/components/archive-card";
import { AttendanceCalendarCard } from "@/components/student/attendance-calendar-card";
import { StudentAcademicPanel } from "@/components/student/academic-panel";
import { StudentApplicationCard } from "@/components/student/application-card";
import { CheckInButton } from "@/components/student/check-in-button";
import { StudentDocumentsCard } from "@/components/student/documents-card";
import { FinalReportCard } from "@/components/student/final-report-card";
import { StudentInquiryCard } from "@/components/student/inquiry-card";
import { NotificationsBell } from "@/components/notifications-bell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { dateLocale } from "@/i18n";
import { useTodayStatus } from "@/lib/api/attendance";
import { useMyAssignments } from "@/lib/api/assignments";
import { useAuthStore } from "@/stores/auth";

export function StudentDashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: assignments, isPending: assignmentsPending } = useMyAssignments();

  // Hozircha 1-assignmentga fokus (active'lardan)
  const activeAssignment =
    assignments?.find((a) => a.status === "active" || a.status === "draft") ?? null;

  const { data: today } = useTodayStatus(activeAssignment?.id ?? null);

  return (
    <main className="container py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg dark:from-emerald-700 dark:to-teal-900">
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">
                {t("student.welcome", { name: user?.first_name })}
              </h2>
              <p className="mt-0.5 text-sm text-emerald-50">
                {activeAssignment
                  ? `${activeAssignment.practice_type_name} · ${
                      activeAssignment.organization_name ??
                      activeAssignment.area_name
                    }`
                  : t("student.notAssigned")}
              </p>
            </div>
            <div className="shrink-0 [&_button]:text-white [&_button]:hover:bg-white/10">
              <NotificationsBell />
            </div>
          </div>
        </div>

        {assignmentsPending && (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!assignmentsPending && !activeAssignment && (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={CalendarDays}
                title={t("student.emptyTitle")}
                description={t("student.emptyDescription")}
              />
            </CardContent>
          </Card>
        )}

        {activeAssignment && (
          <>
            {/* Bugungi davomat (Check-in / Check-out) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("student.todayAttendance")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CheckInButton assignmentId={activeAssignment.id} today={today} />
                {today && (
                  <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{t("common.status")}:</span>
                    <AttendanceStatusBadge status={today.status} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* To'liq davomat va Taqvim (Kalendar + Statistika + Ro'yxat) */}
            <AttendanceCalendarCard assignment={activeAssignment} />

            {/* Amaliyot muddati */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("student.practicePeriod")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{t("student.startDate")}</div>
                  <div>{new Date(activeAssignment.start_date).toLocaleDateString(dateLocale())}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("student.endDate")}</div>
                  <div>{new Date(activeAssignment.end_date).toLocaleDateString(dateLocale())}</div>
                </div>
                {activeAssignment.supervisor_full_name && (
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">{t("student.supervisorLabel")}</div>
                    <div>{activeAssignment.supervisor_full_name}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Academic panel — tasks/journal/analyses */}
            <StudentAcademicPanel assignmentId={activeAssignment.id} />

            {/* Hujjatlarim — barcha attachments */}
            <StudentDocumentsCard assignmentId={activeAssignment.id} />

            {/* Yakuniy hisobot — arxivga yo'l */}
            <FinalReportCard assignmentId={activeAssignment.id} />

            {/* Yig'ma jild */}
            <ArchiveCard assignmentId={activeAssignment.id} />
          </>
        )}

        {/* Amaliyot arizalari — biriktirishdan mustaqil, har doim ko'rinadi */}
        <StudentApplicationCard />

        {/* Adminga murojaat (chat) */}
        <StudentInquiryCard />
      </div>
    </main>
  );
}
