import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DepartmentFormDialog } from "@/components/admin/academic/department-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteDepartment, useDepartments, useFaculties } from "@/lib/api/academic";
import type { Department, UUID } from "@/lib/api/types";

const ALL = "__all__";

export function DepartmentList() {
  const faculties = useFaculties();
  const [facultyId, setFacultyId] = useState<UUID | undefined>(undefined);
  const departments = useDepartments(facultyId);
  const del = useDeleteDepartment();
  const [editing, setEditing] = useState<Department | null>(null);
  const [creating, setCreating] = useState(false);

  const facultyById = new Map((faculties.data?.items ?? []).map((f) => [f.id, f]));

  const handleDelete = async (d: Department) => {
    if (!confirm(`"${d.name}" kafedrani o'chirishni tasdiqlang?`)) return;
    try {
      await del.mutateAsync(d.id);
      toast.success("O'chirildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const items = departments.data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
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
          Yangi kafedra
        </Button>
      </div>

      {departments.isPending && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {departments.error && (
        <Alert variant="destructive">
          <AlertDescription>{departments.error.message}</AlertDescription>
        </Alert>
      )}

      {departments.data && items.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Building2}
            title="Kafedralar yo'q"
            description="Fakultet tanlab yangi kafedra qo'shing"
          />
        </div>
      )}

      {departments.data && items.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi</TableHead>
                <TableHead className="w-[120px]">Kod</TableHead>
                <TableHead>Fakultet</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>
                    {d.code ? (
                      <Badge variant="secondary" className="font-mono">
                        {d.code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
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

      <DepartmentFormDialog
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
