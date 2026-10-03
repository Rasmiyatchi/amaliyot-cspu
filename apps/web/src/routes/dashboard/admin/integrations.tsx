import {
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  Key,
  RefreshCw,
  School,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminStats } from "@/lib/api/stats";
import { useAuthStore, type User } from "@/stores/auth";

/** Admin modul ruxsati — `Protected` / backend `require_permission` bilan bir xil qoida. */
function canAccess(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return (user.permissions ?? []).includes(permission);
}

type Status = "active" | "partial" | "planned";

export function IntegrationsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";
  const canStructure = canAccess(user, "structure");
  const { data: stats, isPending } = useAdminStats();

  const verifyExample = `${window.location.origin}/verify/…`;

  return (
    <div className="container max-w-5xl space-y-8 py-8">
      {/* Header */}
      <div className="space-y-1 border-b border-border/70 pb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {t("adminIntegrations.title")}
          </h1>
          <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-semibold">
            {t("adminIntegrations.badge")}
          </Badge>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("adminIntegrations.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
        {/* 1. HEMIS — Excel import ishlaydi, API sinxronizatsiyasi hali ulanmagan */}
        <IntegrationCard
          icon={Database}
          title={t("adminIntegrations.hemis.title")}
          subtitle={t("adminIntegrations.hemis.subtitle")}
          status="partial"
          statusLabel={t("adminIntegrations.hemis.status")}
          description={t("adminIntegrations.hemis.description")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoTile icon={Users} label={t("adminIntegrations.hemis.studentsLabel")}>
              <div className="text-lg font-extrabold text-foreground">
                {isPending ? "…" : (stats?.students?.total ?? 0).toLocaleString()}
              </div>
              {canStructure && (
                <TileLink to="/admin/structure/students">
                  {t("adminIntegrations.hemis.importLink")}
                </TileLink>
              )}
            </InfoTile>
            <InfoTile icon={School} label={t("adminIntegrations.hemis.structureLabel")}>
              <div className="text-sm font-bold text-foreground">
                {t("adminIntegrations.hemis.structureValue")}
              </div>
              {canStructure && (
                <TileLink to="/admin/structure/faculties">
                  {t("adminIntegrations.hemis.structureLink")}
                </TileLink>
              )}
            </InfoTile>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
              {t("adminIntegrations.hemis.method")}
            </span>
            {/* Haqiqiy API sinxronizatsiyasi yo'q — tugma faqat holatni ko'rsatadi */}
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-7 gap-1.5 px-2 text-xs"
              title={t("adminIntegrations.hemis.syncUnavailable")}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("adminIntegrations.hemis.syncButton")}
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {t("adminIntegrations.soon")}
              </Badge>
            </Button>
          </div>
        </IntegrationCard>

        {/* 2. QR verifikatsiya */}
        <IntegrationCard
          icon={ShieldCheck}
          title={t("adminIntegrations.qr.title")}
          subtitle={t("adminIntegrations.qr.subtitle")}
          status="active"
          statusLabel={t("adminIntegrations.statusActive")}
          description={t("adminIntegrations.qr.description")}
        >
          <dl className="space-y-2 rounded-lg border border-border/70 bg-muted/40 p-2.5 text-xs">
            <SpecRow label={t("adminIntegrations.qr.publicUrl")}>
              <span className="break-all font-mono">{verifyExample}</span>
            </SpecRow>
            <SpecRow label={t("adminIntegrations.qr.qrStandard")}>ISO/IEC 18004 · ECC-M</SpecRow>
            <SpecRow label={t("adminIntegrations.qr.pdfGenerator")}>
              {t("adminIntegrations.qr.pdfGeneratorValue")}
            </SpecRow>
          </dl>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            <span>{t("adminIntegrations.qr.templatesNote")}</span>
            {isSuperAdmin && (
              <Link
                to="/admin/contract-templates"
                className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline"
              >
                {t("adminIntegrations.qr.templatesLink")}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </IntegrationCard>

        {/* 3. E-IMZO / OneID — rejalashtirilgan */}
        <IntegrationCard
          icon={Key}
          title={t("adminIntegrations.eimzo.title")}
          subtitle={t("adminIntegrations.eimzo.subtitle")}
          status="planned"
          statusLabel={t("adminIntegrations.statusPlanned")}
          description={t("adminIntegrations.eimzo.description")}
        >
          <PlannedFooter text={t("adminIntegrations.eimzo.current")} soon={t("adminIntegrations.soon")} />
        </IntegrationCard>

        {/* 4. Telegram / xabarnomalar — rejalashtirilgan */}
        <IntegrationCard
          icon={BellRing}
          title={t("adminIntegrations.telegram.title")}
          subtitle={t("adminIntegrations.telegram.subtitle")}
          status="planned"
          statusLabel={t("adminIntegrations.statusPlanned")}
          description={t("adminIntegrations.telegram.description")}
        >
          <PlannedFooter
            text={t("adminIntegrations.telegram.current")}
            soon={t("adminIntegrations.soon")}
          />
        </IntegrationCard>
      </div>
    </div>
  );
}

const STATUS_BADGE_CLASS: Record<Status, string> = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  partial:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
  planned: "",
};

function IntegrationCard({
  icon: Icon,
  title,
  subtitle,
  status,
  statusLabel,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  status: Status;
  statusLabel: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col rounded-xl border border-border/70 bg-card shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-bold text-foreground">{title}</CardTitle>
              <CardDescription className="text-xs">{subtitle}</CardDescription>
            </div>
          </div>
          <Badge
            variant={status === "planned" ? "secondary" : "outline"}
            className={`shrink-0 gap-1 text-[11px] font-semibold ${STATUS_BADGE_CLASS[status]}`}
          >
            {status === "active" && <CheckCircle2 className="h-3 w-3" />}
            {status === "partial" && <FileSpreadsheet className="h-3 w-3" />}
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function InfoTile({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-1.5 rounded-lg border border-border/70 bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">{label}</span>
      </div>
      {children}
    </div>
  );
}

function TileLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
    >
      {children}
      <ArrowUpRight className="h-3 w-3" />
    </Link>
  );
}

function SpecRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium text-foreground">{children}</dd>
    </div>
  );
}

function PlannedFooter({ text, soon }: { text: string; soon: string }) {
  return (
    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        {text}
      </span>
      <Badge variant="secondary" className="text-[11px] font-semibold">
        {soon}
      </Badge>
    </div>
  );
}
