import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GroupFormDialog } from "@/components/admin/academic/group-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useAcademicYears,
  useDeleteGroup,
  useDirections,
  useGroups,
} from "@/lib/api/academic";
import type { Group } from "@/lib/api/types";

export function GroupList() {
  const groups = useGroups();
  const directions = useDirections();
  const academicYears = useAcademicYears();
  const del = useDeleteGroup();
  const [editing, setEditing] = useState<Group | null>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = async (g: Group) => {
    if (!confirm(`"${g.name}" ni o'chirishni tasdiqlang?`)) return;
    try {
      await del.mutateAsync(g.id);
      toast.success("O'chirildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const dirById = new Map((directions.data?.items ?? []).map((d) => [d.id, d]));
  const ayById = new Map((academicYears.data ?? []).map((ay) => [ay.id, ay]));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Yangi guruh
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

      {groups.data && groups.data.items.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Users}
            title="Guruhlar yo'q"
            description="Yo'nalish va o'quv yili tanlab yangi guruh yarating"
          />
        </div>
      )}

      {groups.data && groups.data.items.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guruh</TableHead>
                <TableHead>Kurs</TableHead>
                <TableHead>Yo'nalish</TableHead>
                <TableHead>Akademik yil</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.data.items.map((g) => {
                const d = dirById.get(g.direction_id);
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{g.course}-kurs</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d ? `${d.code} — ${d.name}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ayById.get(g.academic_year_id)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(g)} aria-label="Tahrirlash">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(g)}
                          aria-label="O'chirish"
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
