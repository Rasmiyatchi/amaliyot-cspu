import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileCheck2,
  History,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CardSkeleton,
  StatCardsSkeleton,
} from "@/components/ui/loading-skeletons";
import { Progress } from "@/components/ui/progress";
import { dateLocale } from "@/i18n";
import { useAdminStats, useSuperAdminStats } from "@/lib/api/stats";
import { useAuthStore } from "@/stores/auth";

export function AdminHome() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";

  const admin = useAdminStats();
  const superAdmin = useSuperAdminStats();
  const stats = isSuperAdmin ? superAdmin.data : admin.data;
  const isPending = isSuperAdmin ? superAdmin.isPending : admin.isPending;
  const error = isSuperAdmin ? superAdmin.error : admin.error;

  return (
    <div className="container max-w-7xl py-8">
      <div
        className={
          "mb-6 overflow-hidden rounded-xl p-6 text-white shadow-lg " +
          (isSuperAdmin
            ? "bg-gradient-to-br from-purple-600 to-indigo-700 dark:from-purple-800 dark:to-indigo-900"
            : "bg-gradient-to-br from-indigo-600 to-blue-700 dark:from-indigo-800 dark:to-blue-900")
        }
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">
              {isSuperAdmin
                ? t("adminIndex.superAdminTitle")
                : t("adminIndex.adminTitle")}
            </h1>
            <p className="mt-0.5 text-sm text-indigo-50">
              {t("adminIndex.welcome", { name: user?.full_name })}
              {isSuperAdmin && t("adminIndex.superAdminSuffix")}
            </p>
          </div>
        </div>
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
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{a.name}</div>
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
                            ? "rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive"
                            : "rounded-md bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400"
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            {isSuperAdmin && superAdmin.data && (
              <StatCard
                label={t("adminIndex.users")}
                value={superAdmin.data.users_total}
                icon={Users}
                accent="primary"
              />
            )}
          </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
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

          {isSuperAdmin && superAdmin.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  {t("adminIndex.recentOverrides")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {superAdmin.data.recent_overrides.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title={t("adminIndex.noOverridesTitle")}
                    description={t("adminIndex.noOverridesDescription")}
                    accent="muted"
                    compact
                  />
                ) : (
                  <div className="space-y-2">
                    {superAdmin.data.recent_overrides.map((ov) => (
                      <div
                        key={ov.id}
                        className="flex items-start gap-3 rounded-md border border-border p-3 text-sm"
                      >
                        <AttendanceStatusBadge status={ov.previous_status} />
                        <span className="text-muted-foreground">→</span>
                        <AttendanceStatusBadge status={ov.new_status} />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{ov.reason}</div>
                          <div className="text-xs text-muted-foreground">
                            {ov.admin_name} ·{" "}
                            {new Date(ov.created_at).toLocaleString(dateLocale())}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
