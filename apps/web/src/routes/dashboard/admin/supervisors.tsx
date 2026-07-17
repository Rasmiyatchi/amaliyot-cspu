import { Pencil, Plus, Trash2, Upload, UserCog, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SupervisorFormDialog } from "@/components/admin/supervisors/supervisor-form-dialog";
import { SupervisorImportDialog } from "@/components/admin/supervisors/supervisor-import-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFaculties } from "@/lib/api/academic";
import { useOrganizations } from "@/lib/api/organizations";
import { useDeleteSupervisor, useSupervisors } from "@/lib/api/supervisors";
import type { Supervisor, UUID } from "@/lib/api/types";

const ALL = "__all__";

export function SupervisorsPage() {
  const [search, setSearch] = useState("");
  const [facultyId, setFacultyId] = useState<string>(ALL);
  const [orgId, setOrgId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const faculties = useFaculties(1, 100);
  const orgs = useOrganizations({}, 1, 200);
  // pageSize=200 — import'dan keyin 20 tadan ortiq supervizor ko'rinmay qolmasin
  // (backend limiti le=200; paginatsiya keyinroq qo'shiladi).
  const { data, isPending, error } = useSupervisors(
    {
      search: search || undefined,
      faculty_id: facultyId === ALL ? undefined : (facultyId as UUID),
      organization_id: orgId === ALL ? undefined : (orgId as UUID),
      is_active: status === ALL ? undefined : status === "active",
    },
    1,
    200,
  );
  const del = useDeleteSupervisor();
  const [editing, setEditing] = useState<Supervisor | null>(null);
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Excel import
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Yangi supervizor
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Qidiruv (F.I.SH. yoki username)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] max-w-xs flex-1"
        />
        <Select value={facultyId} onValueChange={setFacultyId}>
          <SelectTrigger className="w-[200px]">
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
        <Select value={orgId} onValueChange={setOrgId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tashkilot" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value={ALL}>Barcha tashkilotlar</SelectItem>
            {(orgs.data?.items ?? []).map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Barcha holat</SelectItem>
            <SelectItem value="active">Faol</SelectItem>
            <SelectItem value="inactive">Nofaol</SelectItem>
          </SelectContent>
        </Select>
        {(facultyId !== ALL || orgId !== ALL || status !== ALL) && (
          <Button
            variant="ghost"
            onClick={() => {
              setFacultyId(ALL);
              setOrgId(ALL);
              setStatus(ALL);
            }}
          >
            Tozalash
          </Button>
        )}
      </div>

      {isPending && !data && <TableSkeleton rows={6} columns={7} />}
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
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={UserCog}
                      title="Supervizorlar topilmadi"
                      description="Yangi supervizor qo'shing yoki filtrlarni o'zgartiring"
                      accent="info"
                      compact
                    />
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
                    {s.organizations.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {s.organizations.map((o) => (
                          <Badge key={o.id} variant="secondary" className="text-xs">
                            {o.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Biriktirilmagan</span>
                    )}
                    {(s.faculty_name || s.department_name) && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {[s.faculty_name, s.department_name].filter(Boolean).join(" · ")}
                      </div>
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
      <SupervisorImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
