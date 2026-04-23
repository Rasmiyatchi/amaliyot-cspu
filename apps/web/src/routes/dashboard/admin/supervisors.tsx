import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SupervisorFormDialog } from "@/components/admin/supervisors/supervisor-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeleteSupervisor, useSupervisors } from "@/lib/api/supervisors";
import type { Supervisor } from "@/lib/api/types";

export function SupervisorsPage() {
  const [search, setSearch] = useState("");
  const { data, isPending, error } = useSupervisors({ search: search || undefined });
  const del = useDeleteSupervisor();
  const [editing, setEditing] = useState<Supervisor | null>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = async (s: Supervisor) => {
    if (!confirm(`"${s.full_name}" ni o'chirishni tasdiqlang?`)) return;
    try {
      await del.mutateAsync(s.id);
      toast.success("O'chirildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Rahbarlar (supervizorlar)</h1>
            <p className="text-sm text-muted-foreground">
              Tashkilotlardagi amaliyot rahbarlari
            </p>
          </div>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Yangi supervizor
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Qidiruv (F.I.SH. yoki username)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isPending && !data && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
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
                <TableHead>F.I.SH.</TableHead>
                <TableHead>Lavozim</TableHead>
                <TableHead>Tashkilot</TableHead>
                <TableHead>Aloqa</TableHead>
                <TableHead className="w-[90px]">Sig'im</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Supervizorlar topilmadi
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((s) => (
                <TableRow key={s.id}>
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
                    {s.organization_name ?? (
                      <span className="text-muted-foreground">Biriktirilmagan</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {s.phone && <div>{s.phone}</div>}
                    {s.email && <div className="text-muted-foreground">{s.email}</div>}
                  </TableCell>
                  <TableCell>{s.capacity}</TableCell>
                  <TableCell>
                    {s.is_active ? (
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
                        onClick={() => setEditing(s)}
                        aria-label="Tahrirlash"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(s)}
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

      <SupervisorFormDialog
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
