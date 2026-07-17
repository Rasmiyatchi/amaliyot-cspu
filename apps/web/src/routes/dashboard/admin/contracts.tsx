import { ChevronLeft, ChevronRight, FileCheck2, FileText, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useDebounce } from "@/hooks/use-debounce";

import { ContractDetailDialog } from "@/components/admin/contracts/contract-detail-dialog";
import { ContractFormDialog } from "@/components/admin/contracts/contract-form-dialog";
import { ContractStatusBadge } from "@/components/admin/contracts/contract-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
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
  downloadContractPdf,
  useContracts,
  type ContractFilters,
} from "@/lib/api/contracts";
import type { Contract, ContractStatus } from "@/lib/api/types";

const ALL = "__all__";

const STATUS_TABS: { value: string; label: string; statuses?: ContractStatus[] }[] = [
  { value: ALL, label: "Barchasi" },
  { value: "yangi", label: "Yangi", statuses: ["draft", "generated"] },
  { value: "imzolangan", label: "Imzolangan", statuses: ["active"] },
  { value: "rad", label: "Rad etilgan", statuses: ["revoked"] },
  { value: "arxiv", label: "Arxiv", statuses: ["expired"] },
];

export function ContractsPage() {
  const [filters, setFilters] = useState<ContractFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState(ALL);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [creating, setCreating] = useState(false);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);
  const pageSize = 20;

  const handlePdf = async (c: Contract) => {
    setPdfBusyId(c.id);
    try {
      await downloadContractPdf(c.id, c.number);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF yuklab bo'lmadi");
    } finally {
      setPdfBusyId(null);
    }
  };

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch || undefined }));
    setPage(1);
  }, [debouncedSearch]);

  const { data, isPending, error, isFetching } = useContracts(filters, page, pageSize);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileCheck2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Shartnomalar</h1>
            <p className="text-sm text-muted-foreground">
              O'quv amaliyot shartnomalari bilan ishlash
            </p>
          </div>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Yangi shartnoma
        </Button>
      </div>

      <Tabs
        value={statusTab}
        onValueChange={(v) => {
          setStatusTab(v);
          const tab = STATUS_TABS.find((t) => t.value === v);
          setFilters((f) => ({ ...f, status: tab?.statuses }));
          setPage(1);
        }}
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Shartnoma raqami yoki kompaniya nomi bo'yicha qidirish"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="min-w-[280px] flex-1 max-w-md"
        />
      </div>

      {isPending && !data && <TableSkeleton columns={7} rows={6} />}
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
                  <TableHead className="w-[50px]">№</TableHead>
                  <TableHead>Shartnoma raqami</TableHead>
                  <TableHead>Kompaniya nomi</TableHead>
                  <TableHead className="w-[200px]">O'quv yili / Muddati</TableHead>
                  <TableHead className="w-[130px]">Yaratilgan sana</TableHead>
                  <TableHead className="w-[140px]">Shartnoma</TableHead>
                  <TableHead className="w-[120px]">Holat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c, i) => (
                  <TableRow
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="cursor-pointer"
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      {(page - 1) * pageSize + i + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.number}</TableCell>
                    <TableCell className="text-sm">{c.organization_name}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{c.academic_year_name}</div>
                      <div className="text-muted-foreground">
                        {new Date(c.start_date).toLocaleDateString("uz-UZ")} —{" "}
                        {new Date(c.end_date).toLocaleDateString("uz-UZ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(c.created_at).toLocaleDateString("uz-UZ")}
                    </TableCell>
                    <TableCell>
                      {c.pdf_path ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto gap-1 p-0 text-primary"
                          disabled={pdfBusyId === c.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handlePdf(c);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                          Shartnoma PDF
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
