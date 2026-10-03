import L from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  GraduationCap,
  Loader2,
  MapPin,
  TrendingUp,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { StatCard } from "@/components/admin/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { areaKeys } from "@/lib/api/areas";
import { orgKeys } from "@/lib/api/organizations";
import { downloadStatsPdfReport, useRoleStats, type AdminStats } from "@/lib/api/stats";
import type { Area, Organization, Paginated } from "@/lib/api/types";
import { useAuthStore, type User } from "@/stores/auth";

// Leaflet standart marker ikonkalari bundler bilan ishlashi uchun
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl,
  shadowUrl,
});

const DEFAULT_MAP_CENTER = { lat: 41.468, lng: 69.582 }; // Chirchiq markazi
const DEFAULT_MAP_ZOOM = 11;

const VALID_TABS = [
  "overview",
  "practices",
  "attendance",
  "tasks",
  "supervisors",
  "objects",
  "issues",
  "map",
  "analytics",
] as const;

type MonitoringTab = (typeof VALID_TABS)[number];

function isMonitoringTab(value: string | null | undefined): value is MonitoringTab {
  return !!value && (VALID_TABS as readonly string[]).includes(value);
}

/** Admin modul ruxsati — `Protected` / backend `require_permission` bilan bir xil qoida. */
function canAccess(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  const perms = user.permissions ?? [];
  return perms.includes(permission) || (permission === "contracts" && perms.includes("practice"));
}

type Issue = {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium";
  actionUrl: string;
  actionText: string;
  permission: string;
};

function hasCoordinates<T extends { geo_lat: number | null; geo_lng: number | null }>(
  item: T,
): item is T & { geo_lat: number; geo_lng: number } {
  return (
    item.geo_lat !== null &&
    item.geo_lng !== null &&
    Number.isFinite(Number(item.geo_lat)) &&
    Number.isFinite(Number(item.geo_lng))
  );
}

/** Ro'yxat endpointining barcha sahifalari (xarita barcha obyektlarni ko'rsatishi kerak). */
async function fetchAllPages<T>(path: string, pageSize: number): Promise<T[]> {
  const page = (n: number) =>
    api.get(`${path}?is_active=true&page=${n}&page_size=${pageSize}`).json<Paginated<T>>();
  const first = await page(1);
  const pages = Math.ceil(first.total / pageSize);
  if (pages <= 1) return first.items;
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => page(i + 2)));
  return [...first.items, ...rest.flatMap((r) => r.items)];
}

export function MonitoringPage() {
  const { t } = useTranslation();
  const { tab: paramTab } = useParams<{ tab?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";
  const can = (permission: string) => canAccess(user, permission);

  // Faqat rolga mos endpoint so'raladi (admin uchun /stats/super-admin 403 qaytarardi)
  const { stats, isPending, error } = useRoleStats(isSuperAdmin);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Aktiv tab — route param (/admin/monitoring/:tab) yoki ?tab=
  const activeTab: MonitoringTab = useMemo(() => {
    if (isMonitoringTab(paramTab)) return paramTab;
    const qTab = searchParams.get("tab");
    return isMonitoringTab(qTab) ? qTab : "overview";
  }, [paramTab, searchParams]);

  const handleTabChange = (val: string) => {
    if (paramTab) {
      navigate(`/admin/monitoring/${val}`);
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", val);
        return next;
      });
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadStatsPdfReport();
      toast.success(t("adminIndex.downloadedPdfToast"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("adminIndex.pdfDownloadError"));
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Xarita — faqat xarita tabi ochilganda; barcha faol tashkilot va hududlar
  const mapEnabled = activeTab === "map";
  const orgsQuery = useQuery({
    queryKey: [...orgKeys.all, "all-active"] as const,
    queryFn: () => fetchAllPages<Organization>("v1/organizations", 200),
    enabled: mapEnabled,
    staleTime: 5 * 60_000,
  });
  const areasQuery = useQuery({
    queryKey: [...areaKeys.all, "all-active"] as const,
    queryFn: () => fetchAllPages<Area>("v1/areas", 100),
    enabled: mapEnabled,
    staleTime: 5 * 60_000,
  });
  const geoOrganizations = useMemo(
    () => (orgsQuery.data ?? []).filter(hasCoordinates),
    [orgsQuery.data],
  );
  const geoAreas = useMemo(() => (areasQuery.data ?? []).filter(hasCoordinates), [areasQuery.data]);
  const mapLoading = orgsQuery.isPending || areasQuery.isPending;
  const mapError = orgsQuery.error ?? areasQuery.error;

  const issues = useMemo(() => buildIssues(stats, t), [stats, t]);
  const visibleIssues = issues.filter((issue) => canAccess(user, issue.permission));

  const unassigned = stats?.students?.unassigned ?? 0;
  const supervisorAlerts = (stats?.capacity_alerts ?? []).filter((a) => a.kind === "supervisor");
  const organizationAlerts = (stats?.capacity_alerts ?? []).filter(
    (a) => a.kind === "organization",
  );
  const attendancePercent = stats?.attendance_30d?.green_percent;

  return (
    <div className="container max-w-7xl space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight">{t("adminMonitoring.title")}</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("adminMonitoring.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="gap-2 text-xs font-semibold"
          >
            {downloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {downloadingPdf ? t("adminMonitoring.pdfPreparing") : t("adminMonitoring.pdfReport")}
          </Button>
          {can("practice") && (
            <Button asChild size="sm" className="gap-2 text-xs font-semibold">
              <Link to="/admin/assignments">
                {t("adminMonitoring.toAssignments")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start">
          {VALID_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="gap-1.5 px-3 py-1.5 text-xs">
              {t(`adminMonitoring.tabs.${tab}`)}
              {tab === "issues" && visibleIssues.length > 0 && (
                <Badge variant="destructive" className="h-4 px-1 text-[10px] font-bold">
                  {visibleIssues.length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 1. UMUMIY HOLAT */}
        <TabsContent value="overview" className="m-0 space-y-6">
          {isPending && (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

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
                        values={{ total: stats?.students?.total ?? 0, count: unassigned }}
                        components={[
                          <b key="0" />,
                          <b key="1" className="text-amber-600 dark:text-amber-400" />,
                        ]}
                      />
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {can("practice") && (
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
                  {can("structure") && (
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

          {/* KPI */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label={t("adminMonitoring.kpi.totalStudents")}
              value={stats?.students?.total ?? 0}
              icon={Users}
              accent="primary"
              hint={t("adminMonitoring.kpi.totalStudentsHint")}
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
              label={t("adminMonitoring.kpi.activePractices")}
              value={stats?.assignments?.by_status?.active ?? 0}
              icon={GraduationCap}
              accent="info"
              hint={t("adminMonitoring.kpi.activePracticesHint")}
            />
            <StatCard
              label={t("adminMonitoring.kpi.attendance")}
              value={attendancePercent != null ? `${attendancePercent}%` : "—"}
              icon={CalendarCheck}
              accent={(attendancePercent ?? 0) >= 80 ? "success" : "warning"}
              hint={t("adminMonitoring.kpi.attendanceHint")}
            />
            <StatCard
              label={t("adminMonitoring.kpi.tasks")}
              value={stats?.tasks?.total ?? 0}
              icon={FileCheck2}
              accent="primary"
              hint={t("adminMonitoring.kpi.tasksHint", {
                count: stats?.tasks?.by_status?.submitted ?? 0,
              })}
            />
            <StatCard
              label={t("adminMonitoring.kpi.issues")}
              value={visibleIssues.length}
              icon={AlertTriangle}
              accent={visibleIssues.length > 0 ? "destructive" : "success"}
              hint={
                visibleIssues.length > 0
                  ? t("adminMonitoring.kpi.issuesHint")
                  : t("adminMonitoring.kpi.noIssues")
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Amaliyot turlari */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold">
                      {t("adminMonitoring.practiceTypes.title")}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t("adminMonitoring.practiceTypes.description")}
                    </CardDescription>
                  </div>
                  {can("practice") && (
                    <Button asChild variant="ghost" size="sm" className="text-xs">
                      <Link to="/admin/practice-types">{t("adminMonitoring.practiceTypes.all")}</Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats?.practice_types && stats.practice_types.length > 0 ? (
                  stats.practice_types.map((pt) => {
                    const percent = pt.total
                      ? Math.round(((pt.active + pt.completed) / pt.total) * 100)
                      : 0;
                    return (
                      <div key={pt.id} className="space-y-1.5 rounded-lg border border-border/60 p-3">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 font-bold text-foreground">
                            {pt.name}{" "}
                            <span className="font-normal text-muted-foreground">({pt.code})</span>
                          </span>
                          <span className="font-mono font-bold text-primary">{percent}%</span>
                        </div>
                        <Progress value={percent} className="h-1.5" />
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
                          <span>
                            {t("adminMonitoring.practiceTypes.active")}:{" "}
                            <b className="text-foreground">{pt.active}</b>
                          </span>
                          <span>
                            {t("adminMonitoring.practiceTypes.completed")}:{" "}
                            <b className="text-foreground">{pt.completed}</b>
                          </span>
                          <span>
                            {t("adminMonitoring.practiceTypes.draft")}:{" "}
                            <b className="text-foreground">{pt.draft}</b>
                          </span>
                          <span>
                            {t("adminMonitoring.practiceTypes.total")}:{" "}
                            <b className="text-foreground">{pt.total}</b>
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    {t("adminMonitoring.practiceTypes.empty")}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <Clock className="h-4 w-4 text-primary" />
                    {t("adminMonitoring.pending.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <KeyValueRow
                    label={t("adminMonitoring.pending.tasks")}
                    value={stats?.pending_reviews?.tasks ?? 0}
                  />
                  <KeyValueRow
                    label={t("adminMonitoring.pending.journals")}
                    value={stats?.pending_reviews?.journals ?? 0}
                  />
                  <KeyValueRow
                    label={t("adminMonitoring.pending.analyses")}
                    value={stats?.pending_reviews?.analyses ?? 0}
                  />
                  <div className="flex justify-between pt-1 font-semibold text-foreground">
                    <span>{t("adminMonitoring.pending.total")}</span>
                    <Badge variant="outline" className="font-mono">
                      {stats?.pending_reviews?.total ?? 0}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <Building2 className="h-4 w-4 text-success" />
                    {t("adminMonitoring.partnership.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <KeyValueRow
                    label={t("adminMonitoring.partnership.organizations")}
                    value={stats?.organizations ?? 0}
                  />
                  <KeyValueRow
                    label={t("adminMonitoring.partnership.supervisors")}
                    value={stats?.supervisors ?? 0}
                  />
                  <KeyValueRow
                    label={t("adminMonitoring.partnership.signed")}
                    value={stats?.contracts?.by_status?.active ?? 0}
                    valueClassName="text-success"
                  />
                  <KeyValueRow
                    label={t("adminMonitoring.partnership.pendingContracts")}
                    value={
                      (stats?.contracts?.by_status?.draft ?? 0) +
                      (stats?.contracts?.by_status?.generated ?? 0)
                    }
                    valueClassName="text-amber-600 dark:text-amber-400"
                    last
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 2. AMALIYOTLAR */}
        <TabsContent value="practices" className="m-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">
                {t("adminMonitoring.practices.title")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("adminMonitoring.practices.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricBox
                  label={t("adminMonitoring.practices.total")}
                  value={stats?.assignments?.total ?? 0}
                />
                <MetricBox
                  label={t("adminMonitoring.practices.active")}
                  value={stats?.assignments?.by_status?.active ?? 0}
                  tone="success"
                />
                <MetricBox
                  label={t("adminMonitoring.practices.draft")}
                  value={stats?.assignments?.by_status?.draft ?? 0}
                  tone="warning"
                />
                <MetricBox
                  label={t("adminMonitoring.practices.completed")}
                  value={stats?.assignments?.by_status?.completed ?? 0}
                  tone="info"
                />
              </div>

              {can("practice") && (
                <div className="pt-2">
                  <Button asChild size="sm" className="gap-2 text-xs">
                    <Link to="/admin/assignments">
                      {t("adminMonitoring.practices.manage")} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. DAVOMAT */}
        <TabsContent value="attendance" className="m-0 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold">
                    {t("adminMonitoring.attendance.title")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t("adminMonitoring.attendance.description")}
                  </CardDescription>
                </div>
                {can("practice") && (
                  <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Link to="/admin/attendance">
                      {t("adminMonitoring.attendance.open")} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricBox
                  label={t("adminMonitoring.attendance.green")}
                  value={stats?.attendance_30d?.green ?? 0}
                  tone="success"
                  large
                />
                <MetricBox
                  label={t("adminMonitoring.attendance.red")}
                  value={stats?.attendance_30d?.red ?? 0}
                  tone="destructive"
                  large
                />
                <MetricBox
                  label={t("adminMonitoring.attendance.pending")}
                  value={stats?.attendance_30d?.pending ?? 0}
                  tone="warning"
                  large
                />
                <MetricBox
                  label={t("adminMonitoring.attendance.rate")}
                  value={attendancePercent != null ? `${attendancePercent}%` : "—"}
                  tone="info"
                  large
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. TOPSHIRIQLAR */}
        <TabsContent value="tasks" className="m-0 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold">{t("adminMonitoring.tasks.title")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("adminMonitoring.tasks.description")}
                  </CardDescription>
                </div>
                {can("practice") && (
                  <Button asChild variant="outline" size="sm" className="text-xs">
                    <Link to="/admin/task-templates">{t("adminMonitoring.tasks.templates")}</Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricBox label={t("adminMonitoring.tasks.total")} value={stats?.tasks?.total ?? 0} />
                <MetricBox
                  label={t("adminMonitoring.tasks.pending")}
                  value={stats?.pending_reviews?.total ?? 0}
                  tone="info"
                />
                <MetricBox
                  label={t("adminMonitoring.tasks.approved")}
                  value={stats?.tasks?.by_status?.approved ?? 0}
                  tone="success"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. RAHBARLAR */}
        <TabsContent value="supervisors" className="m-0 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold">
                    {t("adminMonitoring.supervisors.title")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t("adminMonitoring.supervisors.description")}
                  </CardDescription>
                </div>
                {can("supervisors") && (
                  <Button asChild variant="outline" size="sm" className="text-xs">
                    <Link to="/admin/supervisors">{t("adminMonitoring.supervisors.list")}</Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-muted-foreground">
                {t("adminMonitoring.supervisors.total", { count: stats?.supervisors ?? 0 })}
              </div>

              {supervisorAlerts.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {t("adminMonitoring.supervisors.overloaded")}
                  </span>
                  {supervisorAlerts.map((sup) => (
                    <div
                      key={sup.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs"
                    >
                      <span className="min-w-0 font-semibold">{sup.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {t("adminMonitoring.supervisors.usage", {
                            used: sup.used,
                            capacity: sup.capacity,
                          })}
                        </span>
                        <Badge variant={sup.severity === "full" ? "destructive" : "outline"}>
                          {sup.percent}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-xs text-success">{t("adminMonitoring.supervisors.allNormal")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. OBYEKTLAR */}
        <TabsContent value="objects" className="m-0 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold">{t("adminMonitoring.objects.title")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("adminMonitoring.objects.description")}
                  </CardDescription>
                </div>
                {can("partners") && (
                  <Button asChild variant="outline" size="sm" className="text-xs">
                    <Link to="/admin/objects">{t("adminMonitoring.objects.catalog")}</Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-muted-foreground">
                {t("adminMonitoring.objects.total", { count: stats?.organizations ?? 0 })}
              </div>

              {organizationAlerts.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {t("adminMonitoring.objects.filling")}
                  </span>
                  {organizationAlerts.map((org) => (
                    <div
                      key={org.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-primary" />
                        <span className="font-semibold">{org.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {t("adminMonitoring.objects.usage", {
                            used: org.used,
                            capacity: org.capacity,
                          })}
                        </span>
                        <Badge variant={org.severity === "full" ? "destructive" : "secondary"}>
                          {org.percent}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-xs text-success">{t("adminMonitoring.objects.allNormal")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. MUAMMOLAR */}
        <TabsContent value="issues" className="m-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t("adminMonitoring.issues.title")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("adminMonitoring.issues.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleIssues.length > 0 ? (
                visibleIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-border p-3.5 transition-colors hover:border-primary/50 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={issue.severity === "high" ? "destructive" : "outline"}
                          className="text-[10px] font-bold uppercase"
                        >
                          {issue.severity === "high"
                            ? t("adminMonitoring.issues.high")
                            : t("adminMonitoring.issues.medium")}
                        </Badge>
                        <span className="text-sm font-bold text-foreground">{issue.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{issue.description}</p>
                    </div>
                    <Button asChild size="sm" variant="secondary" className="shrink-0 text-xs">
                      <Link to={issue.actionUrl}>{issue.actionText}</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title={t("adminMonitoring.issues.emptyTitle")}
                  description={t("adminMonitoring.issues.emptyDescription")}
                  compact
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. XARITA */}
        <TabsContent value="map" className="m-0 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    {t("adminMonitoring.map.title")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t("adminMonitoring.map.description")}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    {t("adminMonitoring.map.organizationsCount", { count: geoOrganizations.length })}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {t("adminMonitoring.map.areasCount", { count: geoAreas.length })}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mapError && (
                <Alert variant="destructive">
                  <AlertDescription>{mapError.message}</AlertDescription>
                </Alert>
              )}
              <div className="relative h-[360px] w-full overflow-hidden rounded-xl border border-border sm:h-[480px]">
                {mapEnabled && (
                  <MapContainer
                    center={[DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng]}
                    zoom={DEFAULT_MAP_ZOOM}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {geoOrganizations.map((org) => (
                      <Marker key={org.id} position={[Number(org.geo_lat), Number(org.geo_lng)]}>
                        <Popup>
                          <div className="space-y-1 p-1">
                            <b className="block text-sm font-bold">{org.name}</b>
                            <div className="text-xs">{org.address_line || org.region}</div>
                            <div className="text-xs font-semibold">
                              {t("adminMonitoring.map.capacity", { count: org.capacity })}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    {geoAreas.map((area) => (
                      <CircleMarker
                        key={area.id}
                        center={[Number(area.geo_lat), Number(area.geo_lng)]}
                        radius={9}
                        pathOptions={{ color: "#059669", fillColor: "#10b981", fillOpacity: 0.5 }}
                      >
                        <Popup>
                          <div className="space-y-1 p-1">
                            <b className="block text-sm font-bold">{area.name}</b>
                            <div className="text-xs">
                              {[area.region, area.district].filter(Boolean).join(", ")}
                            </div>
                            <div className="text-xs font-semibold">
                              {t("adminMonitoring.map.capacity", { count: area.capacity })}
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                )}
                {mapLoading && (
                  <div className="absolute inset-0 z-[400] flex items-center justify-center bg-background/60">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-sky-600" />
                  {t("adminMonitoring.map.legendOrganization")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border-2 border-emerald-600 bg-emerald-500/50" />
                  {t("adminMonitoring.map.legendArea")}
                </span>
              </div>

              {!mapLoading && !mapError && geoOrganizations.length + geoAreas.length === 0 && (
                <p className="py-2 text-center text-xs text-amber-600 dark:text-amber-400">
                  {t("adminMonitoring.map.noCoordinates")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. TAHLIL */}
        <TabsContent value="analytics" className="m-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">{t("adminMonitoring.analytics.title")}</CardTitle>
              <CardDescription className="text-xs">
                {t("adminMonitoring.analytics.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 rounded-lg border border-border/70 bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{t("adminMonitoring.analytics.reportTitle")}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t("adminMonitoring.analytics.reportDescription")}
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="gap-2 text-xs font-bold"
                  >
                    {downloadingPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {downloadingPdf
                      ? t("adminMonitoring.analytics.preparing")
                      : t("adminMonitoring.analytics.download")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Diqqat talab holatlar ro'yxati (har biri tegishli modul ruxsati bilan). */
function buildIssues(stats: AdminStats | undefined, t: TFunction): Issue[] {
  if (!stats) return [];
  const list: Issue[] = [];

  const unassigned = stats.students?.unassigned ?? 0;
  if (unassigned > 0) {
    list.push({
      id: "unassigned-students",
      title: t("adminMonitoring.issues.unassignedTitle"),
      description: t("adminMonitoring.issues.unassignedDesc", { count: unassigned }),
      severity: "high",
      actionUrl: "/admin/assignments?new=1",
      actionText: t("adminMonitoring.issues.unassignedAction"),
      permission: "practice",
    });
  }

  for (const alert of stats.capacity_alerts ?? []) {
    const isOrganization = alert.kind === "organization";
    list.push({
      id: `capacity-${alert.kind}-${alert.id}`,
      title: isOrganization
        ? t("adminMonitoring.issues.capacityOrgTitle", { name: alert.name })
        : t("adminMonitoring.issues.capacitySupervisorTitle", { name: alert.name }),
      description: t("adminMonitoring.issues.capacityDesc", {
        percent: alert.percent,
        used: alert.used,
        capacity: alert.capacity,
      }),
      severity: alert.severity === "full" ? "high" : "medium",
      actionUrl: isOrganization ? "/admin/objects" : "/admin/supervisors",
      actionText: t("adminMonitoring.issues.capacityAction"),
      permission: isOrganization ? "partners" : "supervisors",
    });
  }

  const pending = stats.pending_reviews;
  if (pending && pending.total > 0) {
    list.push({
      id: "pending-reviews",
      title: t("adminMonitoring.issues.pendingTitle"),
      description: t("adminMonitoring.issues.pendingDesc", {
        total: pending.total,
        tasks: pending.tasks,
        journals: pending.journals,
        analyses: pending.analyses,
      }),
      severity: pending.total > 20 ? "high" : "medium",
      // Tekshiruv biriktirish oynasida (Topshiriqlar/Kundalik/Tahlil tablari) qilinadi
      actionUrl: "/admin/assignments?status=active",
      actionText: t("adminMonitoring.issues.pendingAction"),
      permission: "practice",
    });
  }

  const draftContracts = stats.contracts?.by_status?.draft ?? 0;
  if (draftContracts > 0) {
    list.push({
      id: "draft-contracts",
      title: t("adminMonitoring.issues.draftContractsTitle"),
      description: t("adminMonitoring.issues.draftContractsDesc", { count: draftContracts }),
      severity: "medium",
      actionUrl: "/admin/contracts",
      actionText: t("adminMonitoring.issues.draftContractsAction"),
      permission: "contracts",
    });
  }

  return list;
}

function KeyValueRow({
  label,
  value,
  valueClassName,
  last = false,
}: {
  label: string;
  value: number;
  valueClassName?: string;
  last?: boolean;
}) {
  return (
    <div
      className={
        last ? "flex justify-between pt-1" : "flex justify-between border-b border-border/50 py-1.5"
      }
    >
      <span className="text-muted-foreground">{label}</span>
      <b className={`font-mono ${valueClassName ?? ""}`}>{value}</b>
    </div>
  );
}

const TONE_CLASS = {
  default: "",
  success: "text-success",
  warning: "text-amber-600 dark:text-amber-400",
  destructive: "text-destructive",
  info: "text-info",
} as const;

function MetricBox({
  label,
  value,
  tone = "default",
  large = false,
}: {
  label: string;
  value: number | string;
  tone?: keyof typeof TONE_CLASS;
  large?: boolean;
}) {
  return (
    <div className={large ? "rounded-lg border border-border p-4 text-center" : "rounded-lg border border-border p-3"}>
      <span className={`text-xs font-medium ${tone === "default" ? "text-muted-foreground" : TONE_CLASS[tone]}`}>
        {label}
      </span>
      <div className={`mt-1 font-black ${large ? "text-3xl" : "text-2xl"} ${TONE_CLASS[tone]}`}>
        {value}
      </div>
    </div>
  );
}
