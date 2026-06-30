import { ChevronLeft, ChevronRight, ClipboardCheck, Download, FileText, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useDebounce } from "@/hooks/use-debounce";

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
import { useDirections, useGroups } from "@/lib/api/academic";
import {
  downloadRecordsPdf,
  downloadRecordsXlsx,
  useRecords,
  type RecordFilters,
} from "@/lib/api/records";
import { useSupervisors } from "@/lib/api/supervisors";
import type { UUID } from "@/lib/api/types";

const ALL = "__all__";
const COURSES = [1, 2, 3, 4, 5];

const EDU_FORMS = [
  { value: "daytime", label: "Kunduzgi" },
  { value: "evening", label: "Kechki" },
  { value: "correspondence", label: "Sirtqi" },
  { value: "distance", label: "Masofaviy" },
];
const DEGREE_TYPES = [
  { value: "bachelor", label: "Bakalavr" },
  { value: "master", label: "Magistr" },
  { value: "phd", label: "PhD / Doktorantura" },
];
const PAGE_SIZE = 20;

export function RecordsPage() {
  const [filters, setFilters] = useState<RecordFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const directionsQ = useDirections(undefined, 1, 200);
  const groupsQ = useGroups(
    { directionId: filters.direction_id, course: filters.course },
    1,
    200,
  );
  const supervisorsQ = useSupervisors({}, 1, 200);

  const effectiveFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch || undefined }),
    [filters, debouncedSearch],
  );

  const { data, isPending, error } = useRecords(effectiveFilters);

  const rows = data ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setFilter = (patch: Partial<RecordFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const handleExport = async (kind: "xlsx" | "pdf") => {
    setExporting(kind);
    try {
      if (kind === "xlsx") await downloadRecordsXlsx(effectiveFilters);
      else await downloadRecordsPdf(effectiveFilters);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklab bo'lmadi");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <ClipboardCheck className="h-5 w-5 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Qaydnomalar</h1>
            <p className="text-sm text-muted-foreground">
              Amaliyotdagi talabalar ro'yxati va baholari
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport("xlsx")}
            disabled={exporting !== null}
          >
            {exporting === "xlsx" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Excel yuklab olish
          </Button>
          <Button
            onClick={() => handleExport("pdf")}
            disabled={exporting !== null || rows.length === 0}
          >
            {exporting === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Baholash qaydnomasi
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-2 rounded-lg border border-border p-3">
        <Input
          placeholder="Ism yoki familiya bo'yicha qidiring..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Select
            value={filters.degree_type ?? ALL}
            onValueChange={(v) => setFilter({ degree_type: v === ALL ? undefined : v })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ta'lim turi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Barcha ta'lim turi</SelectItem>
              {DEGREE_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.education_form ?? ALL}
            onValueChange={(v) => setFilter({ education_form: v === ALL ? undefined : v })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ta'lim shakli" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Barcha ta'lim shakli</SelectItem>
              {EDU_FORMS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.direction_id ?? ALL}
            onValueChange={(v) =>
              setFilter({ direction_id: v === ALL ? undefined : (v as UUID), group_id: undefined })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Mutaxassislik" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>Barcha mutaxassislik</SelectItem>
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
              setFilter({ course: v === ALL ? undefined : Number(v), group_id: undefined })
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Kurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Barcha kurs</SelectItem>
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
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Guruh" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>Barcha guruh</SelectItem>
              {(groupsQ.data?.items ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.supervisor_id ?? ALL}
            onValueChange={(v) => setFilter({ supervisor_id: v === ALL ? undefined : (v as UUID) })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Rahbar" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>Barcha rahbar</SelectItem>
              {(supervisorsQ.data?.items ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.start_from ?? ""}
            onChange={(e) => setFilter({ start_from: e.target.value || undefined })}
            className="w-[160px]"
          />
          <Input
            type="date"
            value={filters.end_to ?? ""}
            onChange={(e) => setFilter({ end_to: e.target.value || undefined })}
            className="w-[160px]"
          />
        </div>
      </div>

      <div className="mb-2 text-sm text-muted-foreground">
        {rows.length} ta amaliyot topildi
      </div>

      {isPending && !data && <TableSkeleton columns={11} rows={8} />}
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
                <TableHead className="w-[50px]">№</TableHead>
                <TableHead>Talaba</TableHead>
                <TableHead>Mutaxassislik</TableHead>
                <TableHead>Guruh</TableHead>
                <TableHead className="w-[70px]">Kurs</TableHead>
                <TableHead>Amaliyot nomi</TableHead>
                <TableHead>Korxona</TableHead>
                <TableHead className="w-[160px]">Muddat</TableHead>
                <TableHead className="w-[100px]">Davomat %</TableHead>
                <TableHead className="w-[120px]">Korxona bahosi</TableHead>
                <TableHead className="w-[130px]">Qaydnoma bahosi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="p-0">
                    <EmptyState
                      icon={ClipboardCheck}
                      title="Ma'lumot yo'q"
                      description="Tanlangan filtrlar bo'yicha qaydnoma topilmadi"
                      compact
                    />
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((r, i) => (
                <TableRow key={r.assignment_id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{r.student_name}</TableCell>
                  <TableCell className="text-sm">
                    {r.direction_name ?? r.direction_code ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{r.group_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.course ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.practice_type_name}</TableCell>
                  <TableCell className="text-sm">{r.object_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(r.start_date).toLocaleDateString("uz-UZ")} —{" "}
                    {new Date(r.end_date).toLocaleDateString("uz-UZ")}
                  </TableCell>
                  <TableCell>
                    {r.attendance_pct !== null ? `${r.attendance_pct}%` : "—"}
                  </TableCell>
                  <TableCell>
                    {r.korxona_grade !== null
                      ? `${r.korxona_grade}${r.korxona_grade_max ? `/${r.korxona_grade_max}` : ""}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {r.qaydnoma_grade !== null ? (
                      <Badge variant={r.credit_earned ? "success" : "secondary"}>
                        {r.qaydnoma_grade}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {rows.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
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
            disabled={page >= totalPages}
          >
            Keyingi
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
