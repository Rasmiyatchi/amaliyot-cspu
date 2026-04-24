import {
  AlertCircle,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileCheck2,
  History,
  Loader2,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAdminStats, useSuperAdminStats } from "@/lib/api/stats";
import { useAuthStore } from "@/stores/auth";

export function AdminHome() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";

  const admin = useAdminStats();
  const superAdmin = useSuperAdminStats();
  const stats = isSuperAdmin ? superAdmin.data : admin.data;
  const isPending = isSuperAdmin ? superAdmin.isPending : admin.isPending;
  const error = isSuperAdmin ? superAdmin.error : admin.error;

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">
            {isSuperAdmin ? "Super admin paneli" : "Admin paneli"}
          </h1>
          <p className="text-sm text-muted-foreground">Salom, {user?.full_name}</p>
        </div>
      </div>

      {isPending && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
                  {stats.pending_reviews.total} ta tasdiqlash kutilmoqda:
                </span>
                {stats.pending_reviews.tasks > 0 && (
                  <span>topshiriqlar: {stats.pending_reviews.tasks}</span>
                )}
                {stats.pending_reviews.journals > 0 && (
                  <span>kundalik: {stats.pending_reviews.journals}</span>
                )}
                {stats.pending_reviews.analyses > 0 && (
                  <span>tahlillar: {stats.pending_reviews.analyses}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Talabalar"
              value={stats.students.total}
              icon={Users}
              accent="primary"
              hint={<>O'qiyapti: {stats.students.by_status.studying}</>}
            />
            <StatCard
              label="Amaliyot biriktirishlari"
              value={stats.assignments.total}
              icon={ClipboardList}
              accent="success"
              hint={
                <>
                  Draft: {stats.assignments.by_status.draft} · Aktiv:{" "}
                  {stats.assignments.by_status.active}
                </>
              }
            />
            <StatCard
              label="Shartnomalar"
              value={stats.contracts.total}
              icon={FileCheck2}
              accent="info"
              hint={
                <>
                  PDF tayyor: {stats.contracts.by_status.generated} · Aktiv:{" "}
                  {stats.contracts.by_status.active}
                </>
              }
            />
            <StatCard
              label="Davomat (30 kun)"
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
              hint={
                <>
                  Yashil: {stats.attendance_30d.green} · Qizil:{" "}
                  {stats.attendance_30d.red}
                </>
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Tashkilotlar"
              value={stats.organizations}
              icon={Building2}
              accent="info"
            />
            <StatCard
              label="Supervizorlar"
              value={stats.supervisors}
              icon={UserCog}
              accent="info"
            />
            <StatCard
              label="Topshiriqlar"
              value={stats.tasks.total}
              icon={ClipboardList}
              accent="primary"
              hint={
                <>
                  Tasdiqlangan: {stats.tasks.by_status.approved} · Yuborilgan:{" "}
                  {stats.tasks.by_status.submitted}
                </>
              }
            />
            {isSuperAdmin && superAdmin.data && (
              <StatCard
                label="Foydalanuvchilar"
                value={superAdmin.data.users_total}
                icon={Users}
                accent="primary"
              />
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Topshiriqlar holati</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <TaskStatusBar
                  label="Tasdiqlangan"
                  count={stats.tasks.by_status.approved}
                  total={stats.tasks.total}
                  color="bg-success"
                />
                <TaskStatusBar
                  label="Yuborilgan"
                  count={stats.tasks.by_status.submitted}
                  total={stats.tasks.total}
                  color="bg-info"
                />
                <TaskStatusBar
                  label="Rad etilgan"
                  count={stats.tasks.by_status.rejected}
                  total={stats.tasks.total}
                  color="bg-destructive"
                />
                <TaskStatusBar
                  label="Boshlanmagan"
                  count={stats.tasks.by_status.not_started}
                  total={stats.tasks.total}
                  color="bg-muted-foreground/40"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Davomat (oxirgi 30 kun)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-success/10 p-3">
                  <div className="text-xs text-muted-foreground">Yashil</div>
                  <div className="text-2xl font-semibold text-success">
                    {stats.attendance_30d.green}
                  </div>
                </div>
                <div className="rounded-md bg-amber-500/10 p-3">
                  <div className="text-xs text-muted-foreground">Kutilmoqda</div>
                  <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                    {stats.attendance_30d.pending}
                  </div>
                </div>
                <div className="rounded-md bg-destructive/10 p-3">
                  <div className="text-xs text-muted-foreground">Qizil</div>
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
                  Oxirgi override'lar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {superAdmin.data.recent_overrides.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Override yozuvlari yo'q
                  </div>
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
                            {new Date(ov.created_at).toLocaleString("uz-UZ")}
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
