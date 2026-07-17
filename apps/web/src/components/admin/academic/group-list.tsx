import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { GroupFormDialog } from "@/components/admin/academic/group-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useAcademicYears,
  useDeleteGroup,
  useDirections,
  useGroups,
} from "@/lib/api/academic";
import type { Group, UUID } from "@/lib/api/types";

const ALL = "__all__";

export function GroupList() {
  const { t } = useTranslation();
  const [directionId, setDirectionId] = useState<UUID | undefined>(undefined);
  const [academicYearId, setAcademicYearId] = useState<UUID | undefined>(undefined);
  const [course, setCourse] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState("");
  const groups = useGroups({ directionId, academicYearId, course });
  const directions = useDirections();
  const academicYears = useAcademicYears();
  const del = useDeleteGroup();
  const [editing, setEditing] = useState<Group | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = groups.data?.items ?? [];
    if (!q) return items;
    return items.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups.data, search]);

  const handleDelete = async (g: Group) => {
    if (!confirm(t("academicGroupList.deleteConfirm", { name: g.name }))) return;
    try {
      await del.mutateAsync(g.id);
      toast.success(t("common.deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const dirById = new Map((directions.data?.items ?? []).map((d) => [d.id, d]));
  const ayById = new Map((academicYears.data ?? []).map((ay) => [ay.id, ay]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("academicGroupList.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[180px] max-w-[220px]"
        />
        <Select
          value={directionId ?? ALL}
          onValueChange={(v) => setDirectionId(v === ALL ? undefined : (v as UUID))}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder={t("common.direction")} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value={ALL}>{t("academicGroupList.allDirections")}</SelectItem>
            {(directions.data?.items ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.code} — {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={academicYearId ?? ALL}
          onValueChange={(v) => setAcademicYearId(v === ALL ? undefined : (v as UUID))}
        >
          <SelectTrigger className="w-[160px]">
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
          <SelectTrigger className="w-[130px]">
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
        <Button className="ml-auto" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          {t("academicGroupList.newGroup")}
        </Button>
      </div>

      {groups.isPending && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {groups.error && (
        <Alert variant="destructive">
          <AlertDescription>{groups.error.message}</AlertDescription>
        </Alert>
      )}

      {groups.data && filtered.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Users}
            title={t("academicGroupList.emptyTitle")}
            description={
              search || directionId || academicYearId || course !== undefined
                ? t("academicGroupList.emptyFiltered")
                : t("academicGroupList.emptyDescription")
            }
          />
        </div>
      )}

      {groups.data && filtered.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.group")}</TableHead>
                <TableHead>{t("common.course")}</TableHead>
                <TableHead>{t("common.direction")}</TableHead>
                <TableHead>{t("academicGroupList.academicYearHeader")}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g) => {
                const d = dirById.get(g.direction_id);
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t("common.courseN", { n: g.course })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d ? `${d.code} — ${d.name}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ayById.get(g.academic_year_id)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(g)} aria-label={t("common.edit")}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(g)}
                          aria-label={t("common.delete")}
                          disabled={del.isPending}
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

      <GroupFormDialog
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
