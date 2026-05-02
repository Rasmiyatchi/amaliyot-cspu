import { ChevronLeft, ChevronRight, FileCheck2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";

import { ContractDetailDialog } from "@/components/admin/contracts/contract-detail-dialog";
import { ContractFormDialog } from "@/components/admin/contracts/contract-form-dialog";
import { ContractStatusBadge } from "@/components/admin/contracts/contract-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useContracts, type ContractFilters } from "@/lib/api/contracts";
import type { Contract, ContractStatus } from "@/lib/api/types";

const ALL = "__all__";

export function ContractsPage() {
  const [filters, setFilters] = useState<ContractFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [creating, setCreating] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch || undefined }));
    setPage(1);
  }, [debouncedSearch]);

  const { data, isPending, error, isFetching } = useContracts(filters, page, pageSize);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileCheck2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Shartnomalar</h1>
            <p className="text-sm text-muted-foreground">
              QR-kodli PDF shartnomalar + ommaviy tekshirish
            </p>
          </div>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Yangi shartnoma
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Qidiruv (raqam yoki tashkilot)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="min-w-[220px] flex-1 max-w-xs"
        />
        <Select
          value={filters.status ?? ALL}
          onValueChange={(v) => {
            setFilters({
              ...filters,
              status: v === ALL ? undefined : (v as ContractStatus),
            });
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Barcha status</SelectItem>
            <SelectItem value="draft">Qoralama</SelectItem>
            <SelectItem value="generated">PDF tayyor</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="expired">Muddati o'tgan</SelectItem>
            <SelectItem value="revoked">Bekor qilingan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPending && !data && <TableSkeleton columns={6} rows={6} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={FileCheck2}
            title="Shartnomalar yo'q"
            description="Avval Biriktirish qiling, keyin shartnoma yarating"
          />
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raqam</TableHead>
                  <TableHead>Tashkilot</TableHead>
                  <TableHead>Amaliyot turi</TableHead>
                  <TableHead className="w-[100px]">Talabalar</TableHead>
                  <TableHead className="w-[180px]">Muddati</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono text-sm">{c.number}</TableCell>
                    <TableCell>{c.organization_name}</TableCell>
                    <TableCell className="text-sm">{c.practice_type_name}</TableCell>
                    <TableCell>{c.students_count}</TableCell>
                    <TableCell className="text-xs">
                      <div>{new Date(c.start_date).toLocaleDateString("uz-UZ")}</div>
                      <div className="text-muted-foreground">
                        {new Date(c.end_date).toLocaleDateString("uz-UZ")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ContractStatusBadge status={c.status} />
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

      <ContractFormDialog open={creating} onClose={() => setCreating(false)} />
      <ContractDetailDialog contract={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
