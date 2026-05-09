import { GraduationCap, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DirectionFormDialog } from "@/components/admin/academic/direction-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteDirection, useDirections, useFaculties } from "@/lib/api/academic";
import type { Direction } from "@/lib/api/types";

export function DirectionList() {
  const faculties = useFaculties();
  const directions = useDirections();
  const del = useDeleteDirection();
  const [editing, setEditing] = useState<Direction | null>(null);
  const [creating, setCreating] = useState(false);

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
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
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

      {directions.data && directions.data.items.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={GraduationCap}
            title="Yo'nalishlar yo'q"
            description="Yo'nalish kodi bilan yo'nalish qo'shing"
          />
        </div>
      )}

      {directions.data && directions.data.items.length > 0 && (
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
              {directions.data.items.map((d) => (
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
