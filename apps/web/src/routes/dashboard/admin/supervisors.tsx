import { HTTPError } from "ky";
import { Loader2, Pencil, Plus, Search, Trash2, Upload, UserCog, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/admin/academic/searchable-select";
import {
  BulkDeleteFailures,
  type BulkDeleteFailure,
} from "@/components/admin/students/bulk-delete-failures";
import { ListPagination } from "@/components/admin/students/list-pagination";
import { SupervisorFormDialog } from "@/components/admin/supervisors/supervisor-form-dialog";
import { SupervisorImportDialog } from "@/components/admin/supervisors/supervisor-import-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
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
import { useAllFaculties } from "@/lib/api/academic";
import { useOrganizations } from "@/lib/api/organizations";
import {
  useBulkDeleteSupervisors,
  useDeleteSupervisor,
  useSupervisor,
  useSupervisors,
} from "@/lib/api/supervisors";
import type { Supervisor, UUID } from "@/lib/api/types";

const ALL = "__all__";
const PAGE_SIZE = 50;

type StatusFilter = typeof ALL | "active" | "inactive";
type OrgFilter = { id: UUID; name: string } | null;

export function SupervisorsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── Filtrlar ────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 300);
  const [facultyId, setFacultyId] = useState<string>(ALL);
  const [org, setOrg] = useState<OrgFilter>(null);
  const [status, setStatus] = useState<StatusFilter>(ALL);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<UUID>>(() => new Set());

  // Filtr o'zgarsa: 1-sahifa va tanlov tozalanadi (ko'rinmaydigan qatorlar o'chib ketmasin)
  const filterKey = `${search}|${facultyId}|${org?.id ?? ""}|${status}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
    setSelectedIds(new Set());
  }

  const hasFilters = !!searchInput || facultyId !== ALL || !!org || status !== ALL;
  const clearFilters = () => {
    setSearchInput("");
    setFacultyId(ALL);
    setOrg(null);
    setStatus(ALL);
  };

  // Tashkilot filtri — server qidiruvi (birinchi 200 ta bilan cheklanmaydi)
  const [orgQueryInput, setOrgQueryInput] = useState("");
  const orgQuery = useDebounce(orgQueryInput.trim(), 300);
  const orgs = useOrganizations({ search: orgQuery || undefined }, 1, 50);
  const orgOptions: SearchableOption[] = useMemo(
    () =>
      (orgs.data?.items ?? []).map((o) => ({
        value: o.id,
        label: o.name,
        hint: [o.region, o.district].filter(Boolean).join(", ") || undefined,
      })),
    [orgs.data],
  );

  const faculties = useAllFaculties();

  const { data, isPending, error, isFetching } = useSupervisors(
    {
      search: search || undefined,
      faculty_id: facultyId === ALL ? undefined : facultyId,
      organization_id: org?.id,
      is_active: status === ALL ? undefined : status === "active",
    },
    page,
    PAGE_SIZE,
  );
  const items = data?.items ?? [];

  // ─── Tahrirlash / o'chirish ─────────────────────────────
  const [editing, setEditing] = useState<Supervisor | null>(null);
  const [creating, setCreating] = useState(false);

  // ⌘K tezkor amali — ?new=1: yaratish oynasi ochiladi, parametr URL'dan olib tashlanadi
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setCreating(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("new");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);
  const [importOpen, setImportOpen] = useState(false);
  const [deleting, setDeleting] = useState<Supervisor | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [failures, setFailures] = useState<BulkDeleteFailure[]>([]);
  const editingDetail = useSupervisor(editing?.id ?? null);
  const editingSupervisor = editing ? (editingDetail.data ?? editing) : null;
  const del = useDeleteSupervisor();
  const bulkDel = useBulkDeleteSupervisors();

  const pageIds = items.map((s) => s.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;

  const togglePage = (checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const toggleOne = (id: UUID, checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      const res = await bulkDel.mutateAsync(ids);
      setConfirmBulk(false);
      setSelectedIds(new Set());
      setFailures(res.failed);
      if (res.failed.length === 0) {
        toast.success(t("adminSupervisors.bulkDeleted", { n: res.deleted }));
      } else {
        const first = res.failed[0];
        toast.warning(
          t("adminSupervisors.bulkDeletePartial", {
            deleted: res.deleted,
            failed: res.failed.length,
            name: first?.full_name ?? "—",
            error: first?.error ?? "",
          }),
          { duration: 10_000 },
        );
      }
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success(t("common.deleted"));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleting.id);
        return next;
      });
      setDeleting(null);
    } catch (e) {
      // 409: talabalar biriktirilgan — server sababini va yechimni (faolsizlantirish) aytadi
      toast.error(e instanceof HTTPError ? e.message : t("common.error"), { duration: 10_000 });
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">{t("adminSupervisors.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("adminSupervisors.subtitle")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            {t("adminSupervisors.excelImport")}
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            {t("adminSupervisors.newSupervisor")}
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t("adminSupervisors.searchPlaceholder")}
            aria-label={t("adminSupervisors.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={facultyId} onValueChange={setFacultyId}>
          <SelectTrigger className="w-full sm:w-[200px]" aria-label={t("common.faculty")}>
            <SelectValue placeholder={t("common.faculty")} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value={ALL}>{t("adminSupervisors.allFaculties")}</SelectItem>
            {(faculties.data ?? []).map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SearchableSelect
          className="w-full sm:w-[220px]"
          aria-label={t("common.organization")}
          value={org?.id ?? null}
          selectedLabel={org?.name}
          onChange={(id) => {
            const option = orgOptions.find((o) => o.value === id);
            setOrg(id && option ? { id, name: option.label } : null);
          }}
          options={orgOptions}
          onSearchChange={setOrgQueryInput}
          loading={orgs.isFetching}
          placeholder={t("common.organization")}
          clearLabel={t("adminSupervisors.allOrganizations")}
        />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[150px]" aria-label={t("common.status")}>
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("adminSupervisors.allStatuses")}</SelectItem>
            <SelectItem value="active">{t("adminSupervisors.active")}</SelectItem>
            <SelectItem value="inactive">{t("adminSupervisors.inactive")}</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="h-4 w-4" />
            {t("common.clear")}
          </Button>
        )}
      </div>

      <BulkDeleteFailures failures={failures} onDismiss={() => setFailures([])} />

      {isPending && !data && <TableSkeleton rows={6} columns={7} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm">
            <Trans
              i18nKey="adminSupervisors.selectedCount"
              values={{ n: selectedIds.size }}
              components={[<span key="0" className="font-medium" />]}
            />
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmBulk(true)}
              disabled={bulkDel.isPending}
            >
              {bulkDel.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("adminSupervisors.deleteSelected", { n: selectedIds.size })}
            </Button>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-primary"
                      aria-label={t("adminSupervisors.selectAllOnPage")}
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedOnPage > 0 && !allOnPageSelected;
                      }}
                      disabled={pageIds.length === 0}
                      onChange={(e) => togglePage(e.target.checked)}
                    />
                  </TableHead>
                  <TableHead>{t("common.fullName")}</TableHead>
                  <TableHead>{t("adminSupervisors.position")}</TableHead>
                  <TableHead>{t("common.organization")}</TableHead>
                  <TableHead>{t("adminSupervisors.contact")}</TableHead>
                  <TableHead className="w-[90px]">{t("adminSupervisors.capacity")}</TableHead>
                  <TableHead className="w-[90px]">{t("common.status")}</TableHead>
                  <TableHead className="w-[100px]">
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState
                        icon={UserCog}
                        title={t("adminSupervisors.emptyTitle")}
                        description={t("adminSupervisors.emptyDesc")}
                        accent="info"
                        compact
                      />
                    </TableCell>
                  </TableRow>
                )}
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-primary"
                        aria-label={t("adminSupervisors.selectRow", { name: s.full_name })}
                        checked={selectedIds.has(s.id)}
                        onChange={(e) => toggleOne(s.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{s.full_name}</div>
                      <div className="text-xs text-muted-foreground">{s.username}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.position}
                      {s.specialty && (
                        <div className="text-xs text-muted-foreground">{s.specialty}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.organizations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.organizations.map((o) => (
                            <Badge key={o.id} variant="secondary" className="text-xs">
                              {o.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {t("adminSupervisors.notAssigned")}
                        </span>
                      )}
                      {(s.faculty_name || s.department_name) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {[s.faculty_name, s.department_name].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.phone && <div>{s.phone}</div>}
                      {s.email && <div className="text-muted-foreground">{s.email}</div>}
                    </TableCell>
                    <TableCell>{s.capacity}</TableCell>
                    <TableCell>
                      {s.is_active ? (
                        <Badge variant="success">{t("adminSupervisors.badgeActive")}</Badge>
                      ) : (
                        <Badge variant="outline">{t("adminSupervisors.badgeInactive")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditing(s)}
                          aria-label={t("common.edit")}
                          title={t("common.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleting(s)}
                          aria-label={t("common.delete")}
                          title={t("common.delete")}
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

      <SupervisorFormDialog
        open={creating || !!editingSupervisor}
        existing={editingSupervisor}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
      <SupervisorImportDialog open={importOpen} onClose={() => setImportOpen(false)} />

      <ConfirmDialog
        open={!!deleting}
        title={t("adminSupervisors.deleteTitle")}
        description={deleting ? t("adminSupervisors.deleteConfirm", { name: deleting.full_name }) : ""}
        confirmText={t("common.delete")}
        variant="destructive"
        isPending={del.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={confirmBulk}
        title={t("adminSupervisors.bulkDeleteTitle")}
        description={
          <>
            {t("adminSupervisors.bulkDeleteConfirm", { n: selectedIds.size })}{" "}
            {t("adminSupervisors.bulkDeleteHint")}
          </>
        }
        confirmText={t("common.delete")}
        variant="destructive"
        isPending={bulkDel.isPending}
        onConfirm={handleBulkDelete}
        onClose={() => setConfirmBulk(false)}
      />
    </div>
  );
}
