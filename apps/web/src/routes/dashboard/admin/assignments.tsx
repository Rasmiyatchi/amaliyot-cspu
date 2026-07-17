import { ChevronLeft, ChevronRight, ClipboardList, Download, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { downloadExport } from "@/lib/api/exports";
import { useDebounce } from "@/hooks/use-debounce";

import { AssignmentDetailDialog } from "@/components/admin/assignments/assignment-detail-dialog";
import { AssignmentStatusBadge } from "@/components/admin/assignments/assignment-status-badge";
import { AssignmentWizard } from "@/components/admin/assignments/assignment-wizard";
import { OverdueTasksCard } from "@/components/overdue-tasks-card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useAcademicYears, useDirections, useGroups } from "@/lib/api/academic";
import { useOrganizations } from "@/lib/api/organizations";
import { usePracticeTypes } from "@/lib/api/practice-types";
import { useSupervisors } from "@/lib/api/supervisors";
import type { AssignmentStatus, PracticeAssignment, UUID } from "@/lib/api/types";

const ALL = "__all__";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: ALL, label: "Barchasi" },
  { value: "draft", label: "Yangi" },
  { value: "active", label: "Faol" },
  { value: "cancelled", label: "Rad etilgan" },
  { value: "completed", label: "Tugatilgan" },
];

const COURSES = [1, 2, 3, 4, 5];

export function AssignmentsPage() {
  const [filters, setFilters] = useState<AssignmentFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selected, setSelected] = useState<PracticeAssignment | null>(null);
  const pageSize = 20;
  const orgs = useOrganizations({}, 1, 200);
  const supervisorsQ = useSupervisors({}, 1, 200);
  const academicYearsQ = useAcademicYears();
  const directionsQ = useDirections(undefined, 1, 200);
  const groupsQ = useGroups(
    { directionId: filters.direction_id, course: filters.course },
    1,
    200,
  );

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch || undefined }));
    setPage(1);
  }, [debouncedSearch]);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadExport("assignments");
      toast.success("CSV yuklab olindi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setExporting(false);
    }
  };

  const { data, isPending, error, isFetching } = useAssignments(filters, page, pageSize);
  const practiceTypes = usePracticeTypes();

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  const setFilter = (patch: Partial<AssignmentFilters>) => {
    setFilters({ ...filters, ...patch });
    setPage(1);
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Amaliyotlar Monitoringi</h1>
            <p className="text-sm text-muted-foreground">
              Talabalarning amaliyot jarayonlarini kuzatish va boshqarish
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            CSV eksport
          </Button>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4" />
            Yangi biriktirish
          </Button>
        </div>
      </div>

      {/* Muddati o'tgan topshiriqlar */}
      <div className="mb-4">
        <OverdueTasksCard />
      </div>

      {/* Status tabs */}
      <Tabs
        value={filters.status ?? ALL}
        onValueChange={(v) =>
          setFilter({ status: v === ALL ? undefined : (v as AssignmentStatus) })
        }
        className="mb-4"
      >
        <TabsList className="flex-wrap">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Qidiruv (F.I.SH. yoki Talaba ID)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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
          value={filters.organization_id ?? ALL}
          onValueChange={(v) =>
            setFilter({ organization_id: v === ALL ? undefined : (v as UUID) })
          }
        >
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
        <Select
          value={filters.supervisor_id ?? ALL}
          onValueChange={(v) =>
            setFilter({ supervisor_id: v === ALL ? undefined : (v as UUID) })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Supervizor" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value={ALL}>Barcha supervizorlar</SelectItem>
            {(supervisorsQ.data?.items ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.academic_year_id ?? ALL}
          onValueChange={(v) =>
            setFilter({ academic_year_id: v === ALL ? undefined : (v as UUID) })
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="O'quv yili" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value={ALL}>Barcha o'quv yillari</SelectItem>
            {(academicYearsQ.data ?? []).map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.direction_id ?? ALL}
          onValueChange={(v) =>
            setFilter({
              direction_id: v === ALL ? undefined : (v as UUID),
              group_id: undefined,
            })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Mutaxassislik" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value={ALL}>Barcha mutaxassisliklar</SelectItem>
            {(directionsQ.data?.items ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.code} · {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.course !== undefined ? String(filters.course) : ALL}
          onValueChange={(v) =>
            setFilter({
              course: v === ALL ? undefined : Number(v),
              group_id: undefined,
            })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Kurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Barcha kurslar</SelectItem>
            {COURSES.map((c) => (
              <SelectItem key={c} value={String(c)}>
                {c}-kurs
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.group_id ?? ALL}
          onValueChange={(v) => setFilter({ group_id: v === ALL ? undefined : (v as UUID) })}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Guruh" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value={ALL}>Barcha guruhlar</SelectItem>
            {(groupsQ.data?.items ?? []).map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name} (kurs {g.course})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filters.practice_type_id ||
          filters.organization_id ||
          filters.supervisor_id ||
          filters.academic_year_id ||
          filters.direction_id ||
          filters.course !== undefined ||
          filters.group_id) && (
          <Button
            variant="ghost"
            onClick={() => {
              setFilters({ search: filters.search });
              setPage(1);
            }}
          >
            Tozalash
          </Button>
        )}
      </div>

      {isPending && !data && <TableSkeleton columns={6} rows={8} />}
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
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState
                        icon={ClipboardList}
                        title="Biriktirish yo'q"
                        description='"Yangi biriktirish" tugmasini bosib boshlang'
                        accent="primary"
                        compact
                      />
                    </TableCell>
                  </TableRow>
                )}
                {data.items.map((a) => (
                  <TableRow
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className="cursor-pointer"
                  >
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
      <AssignmentDetailDialog
        assignment={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
