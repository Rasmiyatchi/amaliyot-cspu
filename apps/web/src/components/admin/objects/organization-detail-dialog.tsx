import {
  Building2,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { WEEKDAYS } from "@/components/admin/assignments/weekday-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Organization, OrganizationKind } from "@/lib/api/types";

const KIND_LABEL_KEY: Record<OrganizationKind, string> = {
  school: "objectsOrganizationsList.kinds.school",
  mtt: "objectsOrganizationsList.kinds.mtt",
  lyceum: "objectsOrganizationsList.kinds.lyceum",
  college: "objectsOrganizationsList.kinds.college",
  university: "objectsOrganizationsList.kinds.university",
  state_organization: "objectsOrganizationsList.kinds.state_organization",
  private_organization: "objectsOrganizationsList.kinds.private_organization",
  company: "objectsOrganizationsList.kinds.company",
  other: "objectsOrganizationsList.kinds.other",
};

const KIND_BADGE_STYLE: Record<OrganizationKind, string> = {
  school: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  mtt: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  lyceum: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  college: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  university: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  state_organization: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  private_organization: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  company: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  other: "bg-muted text-muted-foreground border-border",
};

const WEEKDAY_LABEL_KEY = new Map<number, string>(WEEKDAYS.map((d) => [d.value, d.labelKey]));

/** API Decimal'ni satr ko'rinishida qaytarishi mumkin ("41.311") */
function toCoord(value: number | string | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-0.5 text-sm sm:grid-cols-[160px_1fr] sm:gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">
        {value ?? <span className="font-normal text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </h3>
      <div className="rounded-lg border border-border/80 bg-card p-3.5">
        <dl className="space-y-2">{children}</dl>
      </div>
    </section>
  );
}

type Props = {
  organization: Organization | null;
  onClose: () => void;
  onEdit?: (org: Organization) => void;
};

export function OrganizationDetailDialog({ organization, onClose, onEdit }: Props) {
  const { t } = useTranslation();
  const lat = organization ? toCoord(organization.geo_lat) : null;
  const lng = organization ? toCoord(organization.geo_lng) : null;
  const hasGeo = lat !== null && lng !== null;

  return (
    <Dialog open={!!organization} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {organization && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-left">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-lg font-semibold">{organization.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${KIND_BADGE_STYLE[organization.kind] || ""}`}
                    >
                      {t(KIND_LABEL_KEY[organization.kind])}
                    </Badge>
                    {organization.is_active ? (
                      <Badge variant="success" className="text-xs">
                        {t("objectsOrganizationsList.activeBadge")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {t("objectsOrganizationsList.inactiveBadge")}
                      </Badge>
                    )}
                  </span>
                </span>
              </DialogTitle>
              {organization.legal_name && organization.legal_name !== organization.name ? (
                <DialogDescription className="text-xs">{organization.legal_name}</DialogDescription>
              ) : (
                <DialogDescription className="sr-only">
                  {t("objectsOrganizationDetailDialog.description")}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <Section
                icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
                title={t("objectsOrganizationDetailDialog.sectionMain")}
              >
                <Row
                  label={t("objectsOrganizationDetailDialog.director")}
                  value={
                    <div>
                      <div>{organization.director_full_name}</div>
                      {organization.director_position && (
                        <div className="text-xs font-normal text-muted-foreground">
                          {organization.director_position}
                        </div>
                      )}
                    </div>
                  }
                />
                {organization.inn && (
                  <Row
                    label={t("objectsOrganizationDetailDialog.inn")}
                    value={<span className="font-mono">{organization.inn}</span>}
                  />
                )}
                {organization.bank_name && (
                  <Row
                    label={t("objectsOrganizationDetailDialog.bankName")}
                    value={organization.bank_name}
                  />
                )}
                {organization.bank_account && (
                  <Row
                    label={t("objectsOrganizationDetailDialog.bankAccount")}
                    value={<span className="font-mono text-xs">{organization.bank_account}</span>}
                  />
                )}
                {organization.bank_mfo && (
                  <Row
                    label={t("objectsOrganizationDetailDialog.mfo")}
                    value={<span className="font-mono text-xs">{organization.bank_mfo}</span>}
                  />
                )}
              </Section>

              <Section
                icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
                title={t("objectsOrganizationDetailDialog.sectionContact")}
              >
                <Row
                  label={t("objectsOrganizationDetailDialog.phone")}
                  value={
                    organization.phone ? (
                      <a
                        href={`tel:${organization.phone}`}
                        className="inline-flex items-center gap-1.5 font-mono text-primary hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        {organization.phone}
                      </a>
                    ) : null
                  }
                />
                {organization.email && (
                  <Row
                    label={t("objectsOrganizationDetailDialog.email")}
                    value={
                      <a
                        href={`mailto:${organization.email}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        {organization.email}
                      </a>
                    }
                  />
                )}
                {organization.website && (
                  <Row
                    label={t("objectsOrganizationDetailDialog.website")}
                    value={
                      <a
                        href={
                          organization.website.startsWith("http")
                            ? organization.website
                            : `https://${organization.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                        {organization.website}
                      </a>
                    }
                  />
                )}
                <Row
                  label={t("objectsOrganizationDetailDialog.area")}
                  value={
                    <span>
                      {organization.region}
                      {organization.district ? `, ${organization.district}` : ""}
                    </span>
                  }
                />
                <Row
                  label={t("objectsOrganizationDetailDialog.address")}
                  value={organization.address_line}
                />
                <Row
                  label={t("objectsOrganizationDetailDialog.geolocation")}
                  value={
                    hasGeo ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {lat.toFixed(5)}, {lng.toFixed(5)}
                        </span>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-normal text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          {t("objectsOrganizationDetailDialog.openMap")}
                        </a>
                      </div>
                    ) : (
                      <span className="font-normal text-amber-700 dark:text-amber-400">
                        {t("objectsOrganizationDetailDialog.geoNotSet")}
                      </span>
                    )
                  }
                />
                <Row
                  label={t("objectsOrganizationDetailDialog.geoRadius")}
                  value={
                    <Badge variant="secondary" className="text-xs">
                      {t("objectsOrganizationDetailDialog.radiusValue", {
                        m: organization.geo_radius_m,
                      })}
                    </Badge>
                  }
                />
              </Section>

              <Section
                icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />}
                title={t("objectsOrganizationDetailDialog.sectionCapacity")}
              >
                <Row
                  label={t("objectsOrganizationDetailDialog.capacity")}
                  value={
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-semibold">
                        {t("objectsOrganizationDetailDialog.capacityValue", {
                          n: organization.capacity,
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("objectsOrganizationDetailDialog.assignedNow", {
                          n: organization.assigned_students_count ?? 0,
                        })}
                      </span>
                    </div>
                  }
                />
                {organization.work_days && organization.work_days.length > 0 && (
                  <Row
                    label={t("objectsOrganizationDetailDialog.workDays")}
                    value={
                      <div className="flex flex-wrap gap-1">
                        {[...organization.work_days]
                          .sort((a, b) => a - b)
                          .map((d) => {
                            const key = WEEKDAY_LABEL_KEY.get(d);
                            return (
                              <Badge key={d} variant="secondary" className="text-xs">
                                {key ? t(key) : d}
                              </Badge>
                            );
                          })}
                      </div>
                    }
                  />
                )}
                {organization.notes && (
                  <Row
                    label={t("objectsOrganizationDetailDialog.notes")}
                    value={
                      <span className="font-normal text-muted-foreground">{organization.notes}</span>
                    }
                  />
                )}
              </Section>
            </div>

            <DialogFooter className="mt-4 gap-2 sm:justify-between">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit(organization);
                  }}
                  className="gap-1.5"
                >
                  <Pencil className="h-4 w-4" />
                  <span>{t("common.edit")}</span>
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={onClose}>
                {t("common.close")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
