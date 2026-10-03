import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardList,
  Download,
  FileCheck2,
  FileText,
  History,
  Loader2,
  UserCog,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { StatCard } from "@/components/admin/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CardSkeleton,
  StatCardsSkeleton,
} from "@/components/ui/loading-skeletons";
import { Progress } from "@/components/ui/progress";
import { dateLocale } from "@/i18n";
import { downloadStatsPdfReport, useRoleStats } from "@/lib/api/stats";
import { useAuthStore, type User } from "@/stores/auth";

/** Admin modul ruxsati — `Protected` / backend `require_permission` bilan bir xil qoida. */
function canAccess(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  const perms = user.permissions ?? [];
  return perms.includes(permission) || (permission === "contracts" && perms.includes("practice"));
}

export function AdminHome() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";

  // Faqat rolga mos endpoint (admin uchun /stats/super-admin 403 qaytarardi)
  const { stats, superAdminStats, isPending, error } = useRoleStats(isSuperAdmin);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadStatsPdfReport();
      toast.success(t("adminIndex.downloadedPdfToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("adminIndex.pdfDownloadError"));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const unassigned = stats?.students?.unassigned ?? 0;

  return (
    <div className="container max-w-7xl py-8">
      {/* Welcome banner */}
      <section className="dash-welcome mb-0">
        <div className="min-w-0">
          <span>{isSuperAdmin ? t("adminIndex.kickerSuper") : t("adminIndex.kickerAdmin")}</span>
          <h2>
            {isSuperAdmin
              ? t("adminIndex.superAdminTitle")
              : t("adminIndex.adminTitle")}
          </h2>
          <p>
            {t("adminIndex.welcome", { name: user?.full_name })}
            {isSuperAdmin && t("adminIndex.superAdminSuffix")}
          </p>
        </div>
        <div className="progress-score">
          <strong>{stats?.students?.total ?? 0}</strong>
          <span>{t("adminIndex.totalStudentsCounter")}</span>
        </div>
      </section>
      <div className="dash-progress mb-6 overflow-hidden rounded-full">
        <i style={{ width: "100%" }} />
      </div>

      {isPending && (
        <div className="space-y-6">
          <StatCardsSkeleton count={4} />
          <StatCardsSkeleton count={4} />
          <CardSkeleton rows={5} />
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {stats && (
        <div className="space-y-6">
          {/* Biriktirilmagan talabalar */}
          {unassigned > 0 && (
            <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3.5 sm:items-center">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">
                        {t("adminMonitoring.unassigned.title")}
                      </h3>
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 bg-amber-500/15 text-xs font-bold text-amber-700 dark:text-amber-300"
                      >
                        {t("adminMonitoring.unassigned.count", { count: unassigned })}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                      <Trans
                        i18nKey="adminMonitoring.unassigned.body"
                        values={{ total: stats.students.total, count: unassigned }}
                        components={[
                          <b key="0" />,
                          <b key="1" className="text-amber-600 dark:text-amber-400" />,
                        ]}
                      />
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {canAccess(user, "practice") && (
                    <Button
                      asChild
                      size="sm"
                      className="gap-1.5 bg-amber-600 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
                    >
                      <Link to="/admin/assignments?new=1">
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>{t("adminMonitoring.unassigned.assign")}</span>
                      </Link>
                    </Button>
                  )}
                  {canAccess(user, "structure") && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-amber-500/30 text-xs"
                    >
                      <Link to="/admin/structure/students?has_assignment=false">
                        <span>{t("adminMonitoring.unassigned.viewList")}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {stats.pending_reviews.total > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span className="font-medium">
                  {t("adminIndex.pendingReviews", {
                    count: stats.pending_reviews.total,
                  })}
                </span>
                {stats.pending_reviews.tasks > 0 && (
                  <span>
                    {t("adminIndex.pendingTasks", {
                      count: stats.pending_reviews.tasks,
                    })}
                  </span>
                )}
                {stats.pending_reviews.journals > 0 && (
                  <span>
                    {t("adminIndex.pendingJournals", {
                      count: stats.pending_reviews.journals,
                    })}
                  </span>
                )}
                {stats.pending_reviews.analyses > 0 && (
                  <span>
                    {t("adminIndex.pendingAnalyses", {
                      count: stats.pending_reviews.analyses,
                    })}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {stats.capacity_alerts.length > 0 && (
            <Card className="border-amber-500/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {t("adminIndex.capacityAlerts", {
                    count: stats.capacity_alerts.length,
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.capacity_alerts.map((a) => (
                    <div
                      key={`${a.kind}-${a.id}`}
                      className="flex items-center gap-3 rounded-md border border-border p-3 text-sm"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                        {a.kind === "organization" ? (
                          <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <UserCog className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="break-words font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.kind === "organization"
                            ? t("common.organization")
                            : t("common.supervisor")}
                          {" · "}
                          {t("adminIndex.capacityUsage", {
                            used: a.used,
                            capacity: a.capacity,
                          })}
                        </div>
                      </div>
                      <div
                        className={
                          a.severity === "full"
                            ? "shrink-0 rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive"
                            : "shrink-0 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400"
                        }
                      >
                        {a.percent}%
                        {a.severity === "full" ? t("adminIndex.fullSuffix") : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label={t("common.students")}
              value={stats.students.total}
              icon={Users}
              accent="primary"
              hint={t("adminIndex.studying", {
                count: stats.students.by_status.studying,
              })}
            />
            <StatCard
              label={t("adminMonitoring.kpi.unassigned")}
              value={unassigned}
              icon={UserX}
              accent={unassigned > 0 ? "warning" : "success"}
              hint={
                unassigned > 0
                  ? t("adminMonitoring.kpi.unassignedHint")
                  : t("adminMonitoring.kpi.allAssigned")
              }
            />
            <StatCard
              label={t("adminIndex.assignments")}
              value={stats.assignments.total}
              icon={ClipboardList}
              accent="success"
              hint={t("adminIndex.assignmentsHint", {
                draft: stats.assignments.by_status.draft,
                active: stats.assignments.by_status.active,
              })}
            />
            <StatCard
              label={t("adminIndex.contracts")}
              value={stats.contracts.total}
              icon={FileCheck2}
              accent="info"
              hint={t("adminIndex.contractsHint", {
                generated: stats.contracts.by_status.generated,
                active: stats.contracts.by_status.active,
              })}
            />
            <StatCard
              label={t("adminIndex.attendance30d")}
              value={
                stats.attendance_30d.green_percent !== null
                  ? `${stats.attendance_30d.green_percent}%`
                  : "—"
              }
              icon={CalendarCheck}
              accent={
                stats.attendance_30d.green_percent !== null &&
                stats.attendance_30d.green_percent >= 80
                  ? "success"
                  : "warning"
              }
              hint={t("adminIndex.attendanceHint", {
                green: stats.attendance_30d.green,
                red: stats.attendance_30d.red,
              })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("adminIndex.organizations")}
              value={stats.organizations}
              icon={Building2}
              accent="info"
            />
            <StatCard
              label={t("adminIndex.supervisors")}
              value={stats.supervisors}
              icon={UserCog}
              accent="info"
            />
            <StatCard
              label={t("adminIndex.tasks")}
              value={stats.tasks.total}
              icon={ClipboardList}
              accent="primary"
              hint={t("adminIndex.tasksHint", {
                approved: stats.tasks.by_status.approved,
                submitted: stats.tasks.by_status.submitted,
              })}
            />
            {superAdminStats && (
              <StatCard
                label={t("adminIndex.users")}
                value={superAdminStats.users_total}
                icon={Users}
                accent="primary"
              />
            )}
          </div>

          {/* Amaliyot turlari bo'yicha statistika */}
          <Card className="overflow-hidden border border-border shadow-sm">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {t("adminIndex.practiceTypesTitle")}
                </CardTitle>
                {stats.practice_types && stats.practice_types.length > 0 && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {t("adminIndex.practiceTypeCount", { count: stats.practice_types.length })}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {!stats.practice_types || stats.practice_types.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title={t("adminIndex.noPracticeTypes")}
                  description={t("adminIndex.noPracticeTypesDesc")}
                  accent="muted"
                  compact
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.practice_types.map((pt) => {
                    const totalAsn = pt.total || 0;
                    const activePct =
                      totalAsn > 0 ? Math.round((pt.active / totalAsn) * 100) : 0;
                    return (
                      <div
                        key={pt.id}
                        className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-semibold leading-tight">
                                {pt.name}
                              </h4>
                              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                {pt.code}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="shrink-0 px-2 py-0.5 text-[10px]"
                            >
                              {pt.min_weeks}–{pt.max_weeks} {t("adminIndex.weeks")}
                            </Badge>
                          </div>

                          <div className="mt-4 flex items-baseline justify-between border-t border-border/60 pt-3">
                            <span className="text-xs text-muted-foreground">
                              {t("adminIndex.totalStudents")}
                            </span>
                            <span className="text-xl font-bold text-foreground">
                              {pt.total}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {t("adminIndex.activeStudents")}: {pt.active}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              {t("adminIndex.completedStudents")}: {pt.completed}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {t("adminIndex.draftStudents")}: {pt.draft}
                            </span>
                          </div>
                        </div>

                        {totalAsn > 0 && (
                          <div className="mt-4 pt-2">
                            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                              <span>{t("adminIndex.activityPct")}</span>
                              <span className="font-semibold">{activePct}%</span>
                            </div>
                            <Progress value={activePct} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("adminIndex.tasksStatusTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <TaskStatusBar
                  label={t("adminIndex.statusApproved")}
                  count={stats.tasks.by_status.approved}
                  total={stats.tasks.total}
                  color="bg-success"
                />
                <TaskStatusBar
                  label={t("adminIndex.statusSubmitted")}
                  count={stats.tasks.by_status.submitted}
                  total={stats.tasks.total}
                  color="bg-info"
                />
                <TaskStatusBar
                  label={t("adminIndex.statusRejected")}
                  count={stats.tasks.by_status.rejected}
                  total={stats.tasks.total}
                  color="bg-destructive"
                />
                <TaskStatusBar
                  label={t("adminIndex.statusNotStarted")}
                  count={stats.tasks.by_status.not_started}
                  total={stats.tasks.total}
                  color="bg-muted-foreground/40"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("adminIndex.attendanceLast30Title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
                <div className="rounded-md bg-success/10 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t("adminIndex.green")}
                  </div>
                  <div className="text-2xl font-semibold text-success">
                    {stats.attendance_30d.green}
                  </div>
                </div>
                <div className="rounded-md bg-amber-500/10 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t("adminIndex.pending")}
                  </div>
                  <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                    {stats.attendance_30d.pending}
                  </div>
                </div>
                <div className="rounded-md bg-destructive/10 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t("adminIndex.red")}
                  </div>
                  <div className="text-2xl font-semibold text-destructive">
                    {stats.attendance_30d.red}
                  </div>
                </div>
              </div>
              {stats.attendance_30d.total > 0 && (
                <Progress
                  value={stats.attendance_30d.green_percent ?? 0}
                  className="h-2"
                />
              )}
            </CardContent>
          </Card>

          {superAdminStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  {t("adminIndex.recentOverrides")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {superAdminStats.recent_overrides.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title={t("adminIndex.noOverridesTitle")}
                    description={t("adminIndex.noOverridesDescription")}
                    accent="muted"
                    compact
                  />
                ) : (
                  <div className="space-y-2">
                    {superAdminStats.recent_overrides.map((ov) => (
                      <div
                        key={ov.id}
                        className="flex flex-wrap items-start gap-3 rounded-md border border-border p-3 text-sm"
                      >
                        <AttendanceStatusBadge status={ov.previous_status} />
                        <span className="text-muted-foreground">→</span>
                        <AttendanceStatusBadge status={ov.new_status} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{ov.reason}</div>
                          <div className="text-xs text-muted-foreground">
                            {ov.admin_name} ·{" "}
                            {formatTashkentDateTime(ov.created_at, dateLocale())}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* PDF hisobot */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t("adminIndex.pdfBannerTitle")}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("adminIndex.pdfBannerDesc")}
                </p>
              </div>
            </div>
            <Button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              size="lg"
              className="shrink-0 gap-2 shadow-md transition-all hover:shadow-lg"
            >
              {isDownloadingPdf ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              <span>
                {isDownloadingPdf
                  ? t("adminIndex.downloadingPdf")
                  : t("adminIndex.downloadPdfReport")}
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskStatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
