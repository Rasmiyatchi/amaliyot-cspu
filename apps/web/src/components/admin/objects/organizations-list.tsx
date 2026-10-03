import { HTTPError } from "ky";
import { Download, Eye, Loader2, MapPin, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { OrganizationDetailDialog } from "@/components/admin/objects/organization-detail-dialog";
import { OrganizationFormDialog } from "@/components/admin/objects/organization-form-dialog";
import { ListPagination } from "@/components/admin/students/list-pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { downloadOrganizationsExport } from "@/lib/api/exports";
import {
  useDeleteOrganization,
  useOrganizationKindCounts,
  useOrganizations,
} from "@/lib/api/organizations";
import type { Organization, OrganizationKind } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const PAGE_SIZE = 50;

const KINDS: readonly OrganizationKind[] = [
  "school",
  "mtt",
  "lyceum",
  "college",
  "university",
  "state_organization",
  "private_organization",
  "company",
  "other",
];

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

const KIND_SHORT_LABEL_KEY: Record<OrganizationKind, string> = {
  school: "objectsOrganizationsList.kindsShort.school",
  mtt: "objectsOrganizationsList.kindsShort.mtt",
  lyceum: "objectsOrganizationsList.kindsShort.lyceum",
  college: "objectsOrganizationsList.kindsShort.college",
  university: "objectsOrganizationsList.kindsShort.university",
  state_organization: "objectsOrganizationsList.kindsShort.state_organization",
  private_organization: "objectsOrganizationsList.kindsShort.private_organization",
  company: "objectsOrganizationsList.kindsShort.company",
  other: "objectsOrganizationsList.kindsShort.other",
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

function KindChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number | undefined;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border/80 bg-card text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
          selected
            ? "bg-primary-foreground/20 text-primary-foreground"
            : count
              ? "bg-primary/10 font-bold text-primary"
              : "bg-muted text-muted-foreground",
        )}
      >
        {count ?? "…"}
      </span>
    </button>
  );
}

export function OrganizationsList() {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [kind, setKind] = useState<OrganizationKind | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Turlar bo'yicha sonlar — serverning `total` qiymatidan (birinchi N ta yozuvni sanash emas)
  const kindCounts = useOrganizationKindCounts(KINDS);

  const search = useDebounce(searchInput.trim(), 300);
  const region = useDebounce(regionInput.trim(), 300);

  // Filtr o'zgarsa 1-sahifaga qaytamiz
  const filterKey = `${search}|${region}|${kind ?? ""}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const { data, isPending, error, isFetching } = useOrganizations(
    { search: search || undefined, region: region || undefined, kind },
    page,
    PAGE_SIZE,
  );

  const del = useDeleteOrganization();
  const [selected, setSelected] = useState<Organization | null>(null);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Organization | null>(null);

  const hasActiveFilters = Boolean(searchInput || regionInput || kind !== undefined);

  const handleClearFilters = () => {
    setSearchInput("");
    setRegionInput("");
    setKind(undefined);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success(t("common.deleted"));
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"), { duration: 8000 });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadOrganizationsExport({
        search: search || undefined,
        region: region || undefined,
        kind,
      });
      toast.success(t("objectsOrganizationsList.excelDownloaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setExporting(false);
    }
  };

  const rowOffset = (page - 1) * PAGE_SIZE;

  return (
    <div className="space-y-4">
      {/* 1. Turlar statistikasi va tezkor filtr */}
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={t("objectsOrganizationsList.kindLabel")}
      >
        <KindChip
          label={t("objectsOrganizationsList.allKinds")}
          count={kindCounts.total}
          selected={kind === undefined}
          onClick={() => setKind(undefined)}
        />
        {KINDS.map((k) => (
          <KindChip
            key={k}
            label={t(KIND_SHORT_LABEL_KEY[k])}
            count={kindCounts.byKind[k]}
            selected={kind === k}
            onClick={() => setKind(kind === k ? undefined : k)}
          />
        ))}
      </div>

      {/* 2. Filtrlar va amallar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-[260px]">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t("objectsOrganizationsList.searchPlaceholder")}
            aria-label={t("objectsOrganizationsList.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 pr-8 text-xs sm:text-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label={t("common.clear")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-[220px]">
          <MapPin
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t("objectsOrganizationsList.regionPlaceholder")}
            aria-label={t("objectsOrganizationsList.regionPlaceholder")}
            value={regionInput}
            onChange={(e) => setRegionInput(e.target.value)}
            className="pl-8 pr-8 text-xs sm:text-sm"
          />
          {regionInput && (
            <button
              type="button"
              onClick={() => setRegionInput("")}
              aria-label={t("common.clear")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={kind ?? ALL}
          onValueChange={(v) => setKind(v === ALL ? undefined : (v as OrganizationKind))}
        >
          <SelectTrigger
            className="w-full text-xs sm:w-[220px] sm:text-sm"
            aria-label={t("objectsOrganizationsList.kindLabel")}
          >
            <SelectValue placeholder={t("objectsOrganizationsList.allKinds")} />
          </SelectTrigger>
          <SelectContent className="min-w-[240px]">
            <SelectItem value={ALL}>{t("objectsOrganizationsList.allKinds")}</SelectItem>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {t(KIND_LABEL_KEY[k])}
                {kindCounts.byKind[k] !== undefined ? ` (${kindCounts.byKind[k]})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={handleClearFilters} className="text-xs sm:text-sm">
            {t("common.clear")}
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting || isPending}
            className="gap-1.5 text-xs sm:text-sm"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{t("objectsOrganizationsList.excelDownload")}</span>
          </Button>

          <Button onClick={() => setCreating(true)} className="gap-1.5 text-xs sm:text-sm">
            <Plus className="h-4 w-4" />
            {t("objectsOrganizationsList.newOrganization")}
          </Button>
        </div>
      </div>

      {/* 3. Holatlar */}
      {isPending && !data && <TableSkeleton rows={5} columns={6} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* 4. Jadval */}
      {data && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45px]">№</TableHead>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead className="w-[140px]">{t("objectsOrganizationsList.kindLabel")}</TableHead>
                  <TableHead>{t("objectsOrganizationsList.columns.director")}</TableHead>
                  <TableHead>{t("objectsOrganizationsList.columns.region")}</TableHead>
                  <TableHead className="w-[130px]">{t("objectsOrganizationsList.columns.capacity")}</TableHead>
                  <TableHead className="w-[90px]">{t("common.status")}</TableHead>
                  <TableHead className="w-[120px] text-right">
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      {t("objectsOrganizationsList.emptyText")}
                    </TableCell>
                  </TableRow>
                )}
                {data.items.map((o, idx) => (
                  <TableRow
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {rowOffset + idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{o.name}</div>
                      {o.legal_name && o.legal_name !== o.name ? (
                        <div className="line-clamp-1 text-xs text-muted-foreground">{o.legal_name}</div>
                      ) : o.inn ? (
                        <div className="font-mono text-xs text-muted-foreground">
                          {t("objectsOrganizationsList.innShort", { inn: o.inn })}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("border text-xs font-medium", KIND_BADGE_STYLE[o.kind])}
                      >
                        {t(KIND_LABEL_KEY[o.kind])}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{o.director_full_name}</div>
                      {o.director_position && (
                        <div className="text-xs text-muted-foreground">{o.director_position}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{o.region}</div>
                      {o.district && <div className="text-xs text-muted-foreground">{o.district}</div>}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span
                          className={
                            (o.assigned_students_count ?? 0) > 0
                              ? "font-semibold text-primary"
                              : "font-medium text-foreground"
                          }
                        >
                          {o.assigned_students_count ?? 0}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{o.capacity}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {o.is_active ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/20 bg-emerald-600/15 text-xs text-emerald-700 dark:text-emerald-400"
                        >
                          {t("objectsOrganizationsList.activeBadge")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {t("objectsOrganizationsList.inactiveBadge")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title={t("objectsOrganizationsList.viewDetails")}
                          aria-label={t("objectsOrganizationsList.viewDetails")}
                          onClick={() => setSelected(o)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={t("common.edit")}
                          aria-label={t("common.edit")}
                          onClick={() => setEditing(o)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={t("common.delete")}
                          aria-label={t("common.delete")}
                          onClick={() => setDeleting(o)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            onPageChange={setPage}
            disabled={isFetching}
          />
        </div>
      )}

      {/* 5. Dialoglar */}
      <OrganizationDetailDialog
        organization={selected}
        onClose={() => setSelected(null)}
        onEdit={(org) => setEditing(org)}
      />

      <OrganizationFormDialog
        open={creating || !!editing}
        existing={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title={t("objectsOrganizationsList.deleteTitle")}
        description={
          deleting ? t("objectsOrganizationsList.deleteConfirm", { name: deleting.name }) : ""
        }
        confirmText={t("common.delete")}
        variant="destructive"
        isPending={del.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
