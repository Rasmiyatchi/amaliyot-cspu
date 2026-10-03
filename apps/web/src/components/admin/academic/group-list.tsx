import { HTTPError } from "ky";
import { Loader2, Pencil, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { GroupFormDialog } from "@/components/admin/academic/group-form-dialog";
import { normalizeSearchText } from "@/components/admin/academic/search-text";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/admin/academic/searchable-select";
import { ListPagination } from "@/components/admin/students/list-pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAcademicYears,
  useAllDirections,
  useAllGroups,
  useDeleteGroup,
  useGroups,
} from "@/lib/api/academic";
import type { Group, UUID } from "@/lib/api/types";

const ALL = "__all__";
const PAGE_SIZE = 50;

type Props = {
  /** "Yangi guruh" dialogi sahifa sarlavhasidagi tugma bilan boshqariladi */
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
};

export function GroupList({ createOpen, onCreateOpenChange }: Props) {
  const { t } = useTranslation();
  const [directionId, setDirectionId] = useState<UUID | undefined>(undefined);
  const [academicYearId, setAcademicYearId] = useState<UUID | undefined>(undefined);
  const [course, setCourse] = useState<number | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(normalizeSearchText(searchInput), 250);
  const searching = search.length > 0;
  const [page, setPage] = useState(1);

  const filters = { directionId, academicYearId, course };
  const filterKey = `${directionId ?? ""}|${academicYearId ?? ""}|${course ?? ""}|${search}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  // Qidiruvsiz — server sahifalaydi. Backend guruhni nom bo'yicha qidirmaydi, shuning uchun
  // qidiruvda filtrga mos BARCHA guruhlar olinib, mahalliy filtrlanadi va sahifalanadi.
  const paged = useGroups(filters, page, PAGE_SIZE, { enabled: !searching, keepPrevious: true });
  const complete = useAllGroups(filters, { enabled: searching });
  const matches = useMemo(() => {
    if (!searching) return [];
    return (complete.data ?? [])
      .filter((g) => normalizeSearchText(g.name).includes(search))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [complete.data, search, searching]);

  const source = searching ? complete : paged;
  const rows = searching
    ? matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : (paged.data?.items ?? []);
  const total = searching ? matches.length : (paged.data?.total ?? 0);
  const loaded = !!source.data;

  const directions = useAllDirections();
  const academicYears = useAcademicYears();
  const directionOptions: SearchableOption[] = useMemo(
    () => (directions.data ?? []).map((d) => ({ value: d.id, label: d.name, hint: d.code })),
    [directions.data],
  );
  const dirById = useMemo(
    () => new Map((directions.data ?? []).map((d) => [d.id, d])),
    [directions.data],
  );
  const ayById = new Map((academicYears.data ?? []).map((ay) => [ay.id, ay]));

  const del = useDeleteGroup();
  const [editing, setEditing] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);

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

  const hasFilters = searching || !!directionId || !!academicYearId || course !== undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-[220px]">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t("academicGroupList.searchPlaceholder")}
            aria-label={t("academicGroupList.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <SearchableSelect
          className="w-full sm:w-[260px]"
          aria-label={t("common.direction")}
          value={directionId ?? null}
          onChange={(v) => setDirectionId(v ?? undefined)}
          options={directionOptions}
          loading={directions.isPending}
          placeholder={t("common.direction")}
          clearLabel={t("academicGroupList.allDirections")}
        />
        <Select
          value={academicYearId ?? ALL}
          onValueChange={(v) => setAcademicYearId(v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-full sm:w-[160px]" aria-label={t("common.academicYear")}>
            <SelectValue placeholder={t("common.academicYear")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("common.allYears")}</SelectItem>
            {(academicYears.data ?? []).map((ay) => (
              <SelectItem key={ay.id} value={ay.id}>
                {ay.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={course !== undefined ? String(course) : ALL}
          onValueChange={(v) => setCourse(v === ALL ? undefined : Number(v))}
        >
          <SelectTrigger className="w-full sm:w-[130px]" aria-label={t("common.course")}>
            <SelectValue placeholder={t("common.course")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("academicGroupList.allCourses")}</SelectItem>
            {[1, 2, 3, 4, 5].map((c) => (
              <SelectItem key={c} value={String(c)}>
                {t("common.courseN", { n: c })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {source.isPending && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {source.error && (
        <Alert variant="destructive">
          <AlertDescription>{source.error.message}</AlertDescription>
        </Alert>
      )}

      {loaded && rows.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Users}
            title={t("academicGroupList.emptyTitle")}
            description={
              hasFilters
                ? t("academicGroupList.emptyFiltered")
                : t("academicGroupList.emptyDescription")
            }
          />
        </div>
      )}

      {loaded && rows.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.group")}</TableHead>
                <TableHead>{t("common.course")}</TableHead>
                <TableHead>{t("common.direction")}</TableHead>
                <TableHead>{t("academicGroupList.academicYearHeader")}</TableHead>
                <TableHead className="w-[100px]">
                  <span className="sr-only">{t("common.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((g) => {
                const d = dirById.get(g.direction_id);
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t("common.courseN", { n: g.course })}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d ? `${d.code} — ${d.name}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ayById.get(g.academic_year_id)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditing(g)}
                          aria-label={t("common.edit")}
                          title={t("common.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleting(g)}
                          aria-label={t("common.delete")}
                          title={t("common.delete")}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {loaded && (
        <ListPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          disabled={source.isFetching}
        />
      )}

      <GroupFormDialog
        open={createOpen || !!editing}
        existing={editing}
        onClose={() => {
          onCreateOpenChange(false);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title={t("adminStructure.deleteTitle")}
        description={deleting ? t("academicGroupList.deleteConfirm", { name: deleting.name }) : ""}
        confirmText={t("common.delete")}
        variant="destructive"
        isPending={del.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
