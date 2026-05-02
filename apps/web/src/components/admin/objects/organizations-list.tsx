import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { OrganizationFormDialog } from "@/components/admin/objects/organization-form-dialog";
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
import {
  useDeleteOrganization,
  useOrganizations,
} from "@/lib/api/organizations";
import type { Organization, OrganizationKind } from "@/lib/api/types";

const KIND_LABEL: Record<OrganizationKind, string> = {
  school: "Maktab",
  mtt: "MTT",
  lyceum: "Litsey",
  college: "Kolleji",
  company: "Korxona",
  university: "OTM",
  other: "Boshqa",
};

export function OrganizationsList() {
  const { data, isPending, error } = useOrganizations();
  const del = useDeleteOrganization();
  const [editing, setEditing] = useState<Organization | null>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = async (org: Organization) => {
    if (!confirm(`"${org.name}" ni o'chirishni tasdiqlang?`)) return;
    try {
      await del.mutateAsync(org.id);
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
          Yangi tashkilot
        </Button>
      </div>

      {isPending && <TableSkeleton rows={5} columns={5} />}
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
                <TableHead className="w-[100px]">Turi</TableHead>
                <TableHead>Direktor</TableHead>
                <TableHead>Viloyat</TableHead>
                <TableHead className="w-[80px]">Sig'im</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Tashkilotlar topilmadi. "Yangi tashkilot" tugmasini bosing.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{KIND_LABEL[o.kind]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.director_full_name}
                    {o.director_position && (
                      <div className="text-xs text-muted-foreground">{o.director_position}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.region}
                    {o.district && (
                      <div className="text-xs text-muted-foreground">{o.district}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{o.capacity}</TableCell>
                  <TableCell>
                    {o.is_active ? (
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
                        onClick={() => setEditing(o)}
                        aria-label="Tahrirlash"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(o)}
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

      <OrganizationFormDialog
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
