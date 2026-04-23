import { ChevronLeft, ChevronRight, ClipboardList, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { AssignmentStatusBadge } from "@/components/admin/assignments/assignment-status-badge";
import { AssignmentWizard } from "@/components/admin/assignments/assignment-wizard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  useAssignments,
  type AssignmentFilters,
} from "@/lib/api/assignments";
import { usePracticeTypes } from "@/lib/api/practice-types";
import type { AssignmentStatus } from "@/lib/api/types";

const ALL = "__all__";

export function AssignmentsPage() {
  const [filters, setFilters] = useState<AssignmentFilters>({});
  const [page, setPage] = useState(1);
  const [wizardOpen, setWizardOpen] = useState(false);
  const pageSize = 20;

  const { data, isPending, error, isFetching } = useAssignments(filters, page, pageSize);
  const practiceTypes = usePracticeTypes();

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  const setFilter = (patch: Partial<AssignmentFilters>) => {
    setFilters({ ...filters, ...patch });
    setPage(1);
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Amaliyot biriktirish</h1>
            <p className="text-sm text-muted-foreground">
              Talabalarni amaliyotga yakka yoki guruh bo'lib biriktirish
            </p>
          </div>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4" />
          Yangi biriktirish
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Qidiruv (F.I.SH. yoki HEMIS ID)"
          value={filters.search ?? ""}
          onChange={(e) => setFilter({ search: e.target.value || undefined })}
          className="min-w-[240px] flex-1 max-w-xs"
        />
        <Select
          value={filters.practice_type_id ?? ALL}
          onValueChange={(v) => setFilter({ practice_type_id: v === ALL ? undefined : v })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Amaliyot turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Barcha turlar</SelectItem>
            {(practiceTypes.data ?? []).map((pt) => (
              <SelectItem key={pt.id} value={pt.id}>
                {pt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? ALL}
          onValueChange={(v) =>
            setFilter({ status: v === ALL ? undefined : (v as AssignmentStatus) })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Barcha status</SelectItem>
            <SelectItem value="draft">Qoralama</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="completed">Tugagan</SelectItem>
            <SelectItem value="cancelled">Bekor qilingan</SelectItem>
          </SelectContent>
        </Select>
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
        <>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Talaba</TableHead>
                  <TableHead>Amaliyot turi</TableHead>
                  <TableHead>Obyekt</TableHead>
                  <TableHead>Supervizor</TableHead>
                  <TableHead className="w-[180px]">Muddati</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Biriktirish yo'q. "Yangi biriktirish" tugmasini bosing.
                    </TableCell>
                  </TableRow>
                )}
                {data.items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.student_full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.student_hemis_id}
                        {a.student_group_name ? ` · ${a.student_group_name}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{a.practice_type_name}</div>
                      {a.requires_contract && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Shartnoma
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.organization_name ?? a.area_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.supervisor_full_name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{new Date(a.start_date).toLocaleDateString("uz-UZ")}</div>
                      <div className="text-muted-foreground">
                        {new Date(a.end_date).toLocaleDateString("uz-UZ")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AssignmentStatusBadge status={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data.total > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Jami: <span className="font-medium text-foreground">{data.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Oldingi
                </Button>
                <span className="px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages || isFetching}
                >
                  Keyingi
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AssignmentWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
