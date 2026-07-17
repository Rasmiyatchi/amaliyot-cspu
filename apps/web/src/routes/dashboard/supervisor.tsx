import { HTTPError } from "ky";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Inbox,
  Loader2,
  MapPin,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { dateLocale } from "@/i18n";
import {
  useApproveDay,
  useAttendanceDays,
  useRejectDay,
} from "@/lib/api/attendance";
import { useMyAssignments } from "@/lib/api/assignments";
import { useSupervisorStats } from "@/lib/api/stats";
import type { AttendanceDay, UUID } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

const fmtTime = (s: string | null) =>
  s
    ? new Date(s).toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })
    : "—";

type DayRowProps = {
  day: AttendanceDay;
};

function DayRow({ day }: DayRowProps) {
  const { t } = useTranslation();
  const approve = useApproveDay();
  const reject = useRejectDay();
  const [expanded, setExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    try {
      await approve.mutateAsync({ id: day.id, data: {} });
      toast.success(t("supervisor.approvedGreen"));
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 3) {
      toast.error(t("supervisor.writeReason"));
      return;
    }
    try {
      await reject.mutateAsync({
        id: day.id,
        data: { note: rejectReason.trim() },
      });
      toast.success(t("supervisor.markedRed"));
      setExpanded(false);
      setRejectReason("");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const canAct = day.status === "pending";
  const busy = approve.isPending || reject.isPending;

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="truncate font-medium">{day.student_full_name}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{day.date}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtTime(day.check_in_at)} — {fmtTime(day.check_out_at)}
            </span>
          </div>
        </div>
        <AttendanceStatusBadge status={day.status} />
        {canAct && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            disabled={busy}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {expanded && canAct && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={busy}
            >
              {approve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              {t("supervisor.approveGreen")}
            </Button>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{t("supervisor.rejectReasonLabel")}</div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("supervisor.rejectReasonPlaceholder")}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={busy || rejectReason.trim().length < 3}
              className="mt-2"
            >
              {reject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <XCircle className="h-4 w-4" />
              {t("supervisor.toRed")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SupervisorDashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: assignments, isPending: assignmentsPending } = useMyAssignments();
  const { data: supervisorStats } = useSupervisorStats();

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

  const pendingDays = visibleDays.filter((d) => d.status === "pending");
  const otherDays = visibleDays.filter((d) => d.status !== "pending");

  return (
    <main className="container py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg dark:from-blue-800 dark:to-indigo-900">
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">
                {t("supervisor.welcome", { name: user?.first_name })}
              </h2>
              <p className="mt-0.5 text-sm text-blue-50">
                {t("supervisor.subtitle")}
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

            {/* Muddati o'tgan topshiriqlar */}
            <OverdueTasksCard />

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

            {/* Kutilayotgan tasdiqlar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarCheck className="h-4 w-4 text-warning" />
                  {t("supervisor.pendingCount", { n: pendingDays.length })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {daysPending && (
                  <div className="flex h-16 items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!daysPending && pendingDays.length === 0 && (
                  <EmptyState
                    icon={CheckCircle2}
                    title={t("supervisor.allApprovedTitle")}
                    description={t("supervisor.allApprovedDesc")}
                    accent="success"
                    compact
                  />
                )}
                {!daysPending && pendingDays.length > 0 && (
                  <div className="space-y-2">
                    {pendingDays.map((d) => (
                      <DayRow key={d.id} day={d} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Yakunlangan kunlar */}
            {otherDays.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    {t("supervisor.completedDaysCount", { n: otherDays.length })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {otherDays.map((d) => (
                      <DayRow key={d.id} day={d} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tasks / Journal / Analyses — tanlangan assignment bo'yicha */}
            {selectedAssignmentId !== "all" && (
              <SupervisorReviewPanel assignmentId={selectedAssignmentId} />
            )}
            {selectedAssignmentId === "all" && assignments.length === 1 && assignments[0] && (
              <SupervisorReviewPanel assignmentId={assignments[0].id} />
            )}
            {/* 2+ talaba bo'lsa "Barchasi" da panel yo'q — ko'rsatma beramiz,
                aks holda tasdiqlash UI'si umuman topilmay qoladi. */}
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
      </div>
    </main>
  );
}
