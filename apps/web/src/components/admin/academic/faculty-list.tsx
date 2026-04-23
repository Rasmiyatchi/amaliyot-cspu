import { Building, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FacultyFormDialog } from "@/components/admin/academic/faculty-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteFaculty, useFaculties } from "@/lib/api/academic";
import type { Faculty } from "@/lib/api/types";

export function FacultyList() {
  const { data, isPending, error } = useFaculties();
  const del = useDeleteFaculty();
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = async (f: Faculty) => {
    if (!confirm(`"${f.name}" ni o'chirishni tasdiqlang?`)) return;
    try {
      await del.mutateAsync(f.id);
      toast.success("O'chirildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Yangi fakultet
        </Button>
      </div>

      {isPending && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Building}
            title="Fakultetlar yo'q"
            description="Birinchi fakultetni qo'shing — yo'nalishlar shunga bog'lanadi"
          />
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Kod</TableHead>
                <TableHead>Nomi</TableHead>
                <TableHead className="w-[180px]">Yaratilgan</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.code ?? "—"}</TableCell>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString("uz-UZ")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(f)} aria-label="Tahrirlash">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(f)}
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

      <FacultyFormDialog
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
