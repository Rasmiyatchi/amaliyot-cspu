import { HTTPError } from "ky";
import { Download, Loader2, MapPin, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AreaFormDialog } from "@/components/admin/objects/area-form-dialog";
import { ListPagination } from "@/components/admin/students/list-pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { useDebounce } from "@/hooks/use-debounce";
import { useAreas, useDeleteArea } from "@/lib/api/areas";
import { downloadAreasExport } from "@/lib/api/exports";
import type { Area } from "@/lib/api/types";

/** Backend /areas: page_size le=100 */
const PAGE_SIZE = 50;

export function AreasList() {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const search = useDebounce(searchInput.trim(), 300);
  const region = useDebounce(regionInput.trim(), 300);

  // Filtr o'zgarsa 1-sahifaga qaytamiz
  const filterKey = `${search}|${region}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const { data, isPending, error, isFetching } = useAreas(
    { search: search || undefined, region: region || undefined },
    page,
    PAGE_SIZE,
  );
  const del = useDeleteArea();
  const [editing, setEditing] = useState<Area | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Area | null>(null);

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
      await downloadAreasExport({
        search: search || undefined,
        region: region || undefined,
      });
      toast.success(t("objectsAreasList.excelDownloaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setExporting(false);
    }
  };

  const rowOffset = (page - 1) * PAGE_SIZE;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-[260px]">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t("objectsAreasList.searchPlaceholder")}
            aria-label={t("objectsAreasList.searchPlaceholder")}
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
            placeholder={t("objectsAreasList.regionPlaceholder")}
            aria-label={t("objectsAreasList.regionPlaceholder")}
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
            <span>{t("objectsAreasList.excelDownload")}</span>
          </Button>

          <Button onClick={() => setCreating(true)} className="gap-1.5 text-xs sm:text-sm">
            <Plus className="h-4 w-4" />
            {t("objectsAreasList.newArea")}
          </Button>
        </div>
      </div>

      {isPending && !data && <TableSkeleton rows={5} columns={4} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45px]">№</TableHead>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("objectsAreasList.regionHeader")}</TableHead>
                  <TableHead className="w-[120px]">{t("objectsAreasList.capacityHeader")}</TableHead>
                  <TableHead className="w-[140px]">{t("objectsAreasList.geoHeader")}</TableHead>
                  <TableHead className="w-[90px]">{t("objectsAreasList.statusHeader")}</TableHead>
                  <TableHead className="w-[100px] text-right">
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {t("objectsAreasList.emptyMessage")}
                    </TableCell>
                  </TableRow>
                )}
                {data.items.map((a, idx) => (
                  <TableRow key={a.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {rowOffset + idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{a.name}</div>
                      {a.description && (
                        <div className="text-xs text-muted-foreground">{a.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{a.region}</div>
                      {a.district && <div className="text-xs text-muted-foreground">{a.district}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.capacity}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {a.geo_lat !== null && a.geo_lng !== null
                        ? `${Number(a.geo_lat).toFixed(2)}, ${Number(a.geo_lng).toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {a.is_active ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/20 bg-emerald-600/15 text-xs text-emerald-700 dark:text-emerald-400"
                        >
                          {t("objectsAreasList.active")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {t("objectsAreasList.inactive")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditing(a)}
                          title={t("common.edit")}
                          aria-label={t("common.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleting(a)}
                          title={t("common.delete")}
                          aria-label={t("common.delete")}
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

      <AreaFormDialog
        open={creating || !!editing}
        existing={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title={t("objectsAreasList.deleteTitle")}
        description={deleting ? t("objectsAreasList.deleteConfirm", { name: deleting.name }) : ""}
        confirmText={t("common.delete")}
        variant="destructive"
        isPending={del.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
