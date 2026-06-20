import { GraduationCap, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DirectionFormDialog } from "@/components/admin/academic/direction-form-dialog";
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
import { useDeleteDirection, useDirections, useFaculties } from "@/lib/api/academic";
import type { Direction, UUID } from "@/lib/api/types";

const ALL = "__all__";

export function DirectionList() {
  const faculties = useFaculties();
  const [facultyId, setFacultyId] = useState<UUID | undefined>(undefined);
  const [search, setSearch] = useState("");
  const directions = useDirections(facultyId);
  const del = useDeleteDirection();
  const [editing, setEditing] = useState<Direction | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = directions.data?.items ?? [];
    if (!q) return items;
    return items.filter(
      (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q),
    );
  }, [directions.data, search]);

  const handleDelete = async (d: Direction) => {
    if (!confirm(`"${d.name}" ni o'chirishni tasdiqlang?`)) return;
    try {
      await del.mutateAsync(d.id);
      toast.success("O'chirildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const facultyById = new Map((faculties.data?.items ?? []).map((f) => [f.id, f]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Qidiruv (nomi yoki kod)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] max-w-xs"
        />
        <Select
          value={facultyId ?? ALL}
          onValueChange={(v) => setFacultyId(v === ALL ? undefined : (v as UUID))}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Fakultet" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value={ALL}>Barcha fakultetlar</SelectItem>
            {(faculties.data?.items ?? []).map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="ml-auto" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Yangi yo'nalish
        </Button>
      </div>

      {directions.isPending && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {directions.error && (
        <Alert variant="destructive">
          <AlertDescription>{directions.error.message}</AlertDescription>
        </Alert>
      )}

      {directions.data && filtered.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={GraduationCap}
            title="Yo'nalishlar yo'q"
            description={
              search || facultyId
                ? "Filtrga mos yo'nalish topilmadi"
                : "Yo'nalish kodi bilan yo'nalish qo'shing"
            }
          />
        </div>
      )}

      {directions.data && filtered.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Kod</TableHead>
                <TableHead>Nomi</TableHead>
                <TableHead>Fakultet</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
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
                      <Button size="icon" variant="ghost" onClick={() => setEditing(d)} aria-label="Tahrirlash">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(d)}
                        aria-label="O'chirish"
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

      <DirectionFormDialog
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
