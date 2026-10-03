import { HTTPError } from "ky";
import { GraduationCap, Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DirectionFormDialog } from "@/components/admin/academic/direction-form-dialog";
import { normalizeSearchText } from "@/components/admin/academic/search-text";
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
  useAllDirections,
  useAllFaculties,
  useDeleteDirection,
  useDirections,
} from "@/lib/api/academic";
import type { Direction, UUID } from "@/lib/api/types";

const ALL = "__all__";
const PAGE_SIZE = 50;

type Props = {
  /** "Yangi yo'nalish" dialogi sahifa sarlavhasidagi tugma bilan boshqariladi */
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
};

export function DirectionList({ createOpen, onCreateOpenChange }: Props) {
  const { t } = useTranslation();
  const faculties = useAllFaculties();
  const [facultyId, setFacultyId] = useState<UUID | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(normalizeSearchText(searchInput), 250);
  const searching = search.length > 0;
  const [page, setPage] = useState(1);

  // Filtr/qidiruv o'zgarsa 1-sahifaga qaytamiz
  const filterKey = `${facultyId ?? ""}|${search}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  // Qidiruvsiz — server sahifalaydi. Backend yo'nalishlarni nom bo'yicha qidirmaydi, shuning
  // uchun qidiruvda filtrga mos BARCHA yo'nalishlar olinib, mahalliy filtrlanadi va sahifalanadi.
  const paged = useDirections(facultyId, page, PAGE_SIZE, {
    enabled: !searching,
    keepPrevious: true,
  });
  const complete = useAllDirections(facultyId, { enabled: searching });
  const matches = useMemo(() => {
    if (!searching) return [];
    return (complete.data ?? []).filter(
      (d) => normalizeSearchText(d.name).includes(search) || d.code.includes(search),
    );
  }, [complete.data, search, searching]);

  const source = searching ? complete : paged;
  const rows = searching
    ? matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : (paged.data?.items ?? []);
  const total = searching ? matches.length : (paged.data?.total ?? 0);
  const loaded = !!source.data;

  const del = useDeleteDirection();
  const [editing, setEditing] = useState<Direction | null>(null);
  const [deleting, setDeleting] = useState<Direction | null>(null);

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

  const facultyById = new Map((faculties.data ?? []).map((f) => [f.id, f]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t("academicDirectionList.searchPlaceholder")}
            aria-label={t("academicDirectionList.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={facultyId ?? ALL}
          onValueChange={(v) => setFacultyId(v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-full sm:w-[240px]" aria-label={t("common.faculty")}>
            <SelectValue placeholder={t("common.faculty")} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value={ALL}>{t("academicDirectionList.allFaculties")}</SelectItem>
            {(faculties.data ?? []).map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
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
            icon={GraduationCap}
            title={t("academicDirectionList.emptyTitle")}
            description={
              searching || facultyId
                ? t("academicDirectionList.emptyFiltered")
                : t("academicDirectionList.emptyHint")
            }
          />
        </div>
      )}

      {loaded && rows.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{t("academicDirectionList.colCode")}</TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.faculty")}</TableHead>
                <TableHead className="w-[100px]">
                  <span className="sr-only">{t("common.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {d.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {facultyById.get(d.faculty_id)?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(d)}
                        aria-label={t("common.edit")}
                        title={t("common.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(d)}
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

      <DirectionFormDialog
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
        description={
          deleting ? t("academicDirectionList.deleteConfirm", { name: deleting.name }) : ""
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
