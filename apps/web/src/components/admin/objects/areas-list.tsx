import { Download, Loader2, MapPin, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AreaFormDialog } from "@/components/admin/objects/area-form-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAreas, useDeleteArea } from "@/lib/api/areas";
import { downloadAreasExport } from "@/lib/api/exports";
import type { Area } from "@/lib/api/types";

export function AreasList() {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [exporting, setExporting] = useState(false);

  const search = useDebounce(searchInput, 300);
  const region = useDebounce(regionInput, 300);
  const { data, isPending, error } = useAreas({
    search: search || undefined,
    region: region || undefined,
  });
  const del = useDeleteArea();
  const [editing, setEditing] = useState<Area | null>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = async (a: Area) => {
    if (!confirm(t("objectsAreasList.deleteConfirm", { name: a.name }))) return;
    try {
      await del.mutateAsync(a.id);
      toast.success(t("common.deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAreasExport({
        search: search || undefined,
        region: region || undefined,
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
            placeholder={t("objectsAreasList.searchPlaceholder")}
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
            placeholder={t("objectsAreasList.regionPlaceholder")}
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
            {t("objectsAreasList.newArea")}
          </Button>
        </div>
      </div>

      {isPending && <TableSkeleton rows={5} columns={4} />}
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
                <TableHead>{t("objectsAreasList.regionHeader")}</TableHead>
                <TableHead className="w-[100px]">
                  {t("objectsAreasList.capacityHeader")}
                </TableHead>
                <TableHead className="w-[140px]">{t("objectsAreasList.geoHeader")}</TableHead>
                <TableHead className="w-[80px]">
                  {t("objectsAreasList.statusHeader")}
                </TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t("objectsAreasList.emptyMessage")}
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.name}</div>
                    {a.description && (
                      <div className="text-xs text-muted-foreground">{a.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.region}
                    {a.district && (
                      <div className="text-xs text-muted-foreground">{a.district}</div>
                    )}
                  </TableCell>
                  <TableCell>{a.capacity}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {a.geo_lat && a.geo_lng
                      ? `${Number(a.geo_lat).toFixed(2)}, ${Number(a.geo_lng).toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {a.is_active ? (
                      <Badge variant="success">{t("objectsAreasList.active")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("objectsAreasList.inactive")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(a)}
                        aria-label={t("common.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(a)}
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

      <AreaFormDialog
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
