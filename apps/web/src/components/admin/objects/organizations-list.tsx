import { Download, Loader2, MapPin, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { OrganizationFormDialog } from "@/components/admin/objects/organization-form-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadOrganizationsExport } from "@/lib/api/exports";
import {
  useDeleteOrganization,
  useOrganizations,
} from "@/lib/api/organizations";
import type { Organization, OrganizationKind } from "@/lib/api/types";

const ALL = "__all__";

const KIND_LABEL_KEY: Record<OrganizationKind, string> = {
  school: "objectsOrganizationsList.kinds.school",
  mtt: "objectsOrganizationsList.kinds.mtt",
  lyceum: "objectsOrganizationsList.kinds.lyceum",
  college: "objectsOrganizationsList.kinds.college",
  company: "objectsOrganizationsList.kinds.company",
  university: "objectsOrganizationsList.kinds.university",
  other: "objectsOrganizationsList.kinds.other",
};

export function OrganizationsList() {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [kind, setKind] = useState<OrganizationKind | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  const search = useDebounce(searchInput, 300);
  const region = useDebounce(regionInput, 300);
  const { data, isPending, error } = useOrganizations({
    search: search || undefined,
    region: region || undefined,
    kind,
  });
  const del = useDeleteOrganization();
  const [editing, setEditing] = useState<Organization | null>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = async (org: Organization) => {
    if (!confirm(t("objectsOrganizationsList.deleteConfirm", { name: org.name }))) return;
    try {
      await del.mutateAsync(org.id);
      toast.success(t("common.deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
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
      toast.success("Excel fayl yuklab olindi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-[260px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("objectsOrganizationsList.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 pr-7 text-xs sm:text-sm"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative min-w-[170px] max-w-[220px]">
          <MapPin className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("objectsOrganizationsList.regionPlaceholder")}
            value={regionInput}
            onChange={(e) => setRegionInput(e.target.value)}
            className="pl-8 pr-7 text-xs sm:text-sm"
          />
          {regionInput && (
            <button
              onClick={() => setRegionInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={kind ?? ALL}
          onValueChange={(v) => setKind(v === ALL ? undefined : (v as OrganizationKind))}
        >
          <SelectTrigger className="w-[160px] text-xs sm:text-sm">
            <SelectValue placeholder={t("objectsOrganizationsList.kindLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("objectsOrganizationsList.allKinds")}</SelectItem>
            {(Object.keys(KIND_LABEL_KEY) as OrganizationKind[]).map((k) => (
              <SelectItem key={k} value={k}>
                {t(KIND_LABEL_KEY[k])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting || isPending}
            className="text-xs sm:text-sm gap-1.5"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>Excel yuklab olish</span>
          </Button>

          <Button onClick={() => setCreating(true)} className="text-xs sm:text-sm gap-1.5">
            <Plus className="h-4 w-4" />
            {t("objectsOrganizationsList.newOrganization")}
          </Button>
        </div>
      </div>

      {isPending && <TableSkeleton rows={5} columns={5} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead className="w-[100px]">{t("objectsOrganizationsList.kindLabel")}</TableHead>
                <TableHead>{t("objectsOrganizationsList.columns.director")}</TableHead>
                <TableHead>{t("objectsOrganizationsList.columns.region")}</TableHead>
                <TableHead className="w-[120px]">{t("objectsOrganizationsList.columns.capacity")}</TableHead>
                <TableHead className="w-[80px]">{t("common.status")}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t("objectsOrganizationsList.emptyText")}
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(KIND_LABEL_KEY[o.kind])}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.director_full_name}
                    {o.director_position && (
                      <div className="text-xs text-muted-foreground">{o.director_position}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.region}
                    {o.district && (
                      <div className="text-xs text-muted-foreground">{o.district}</div>
                    )}
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
                      <Badge variant="success">{t("objectsOrganizationsList.activeBadge")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("objectsOrganizationsList.inactiveBadge")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(o)}
                        aria-label={t("common.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(o)}
                        aria-label={t("common.delete")}
                        disabled={del.isPending}
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
      )}

      <OrganizationFormDialog
        open={creating || !!editing}
        existing={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
