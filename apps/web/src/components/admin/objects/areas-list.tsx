import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AreaFormDialog } from "@/components/admin/objects/area-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAreas, useDeleteArea } from "@/lib/api/areas";
import type { Area } from "@/lib/api/types";

export function AreasList() {
  const { data, isPending, error } = useAreas();
  const del = useDeleteArea();
  const [editing, setEditing] = useState<Area | null>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = async (a: Area) => {
    if (!confirm(`"${a.name}" ni o'chirishni tasdiqlang?`)) return;
    try {
      await del.mutateAsync(a.id);
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
          Yangi hudud
        </Button>
      </div>

      {isPending && <TableSkeleton rows={5} columns={4} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi</TableHead>
                <TableHead>Viloyat</TableHead>
                <TableHead className="w-[100px]">Sig'im</TableHead>
                <TableHead className="w-[140px]">Geo</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Hududlar topilmadi. "Yangi hudud" tugmasini bosing.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.name}</div>
                    {a.description && (
                      <div className="text-xs text-muted-foreground">{a.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.region}
                    {a.district && (
                      <div className="text-xs text-muted-foreground">{a.district}</div>
                    )}
                  </TableCell>
                  <TableCell>{a.capacity}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {a.geo_lat && a.geo_lng
                      ? `${Number(a.geo_lat).toFixed(2)}, ${Number(a.geo_lng).toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {a.is_active ? (
                      <Badge variant="success">Aktiv</Badge>
                    ) : (
                      <Badge variant="outline">Deaktiv</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(a)}
                        aria-label="Tahrirlash"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(a)}
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

      <AreaFormDialog
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
