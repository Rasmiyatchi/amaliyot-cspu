import { ChevronLeft, ChevronRight, FileCheck2, FileText, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { dateLocale } from "@/i18n";
import {
  downloadContractPdf,
  useContracts,
  type ContractFilters,
} from "@/lib/api/contracts";
import type { Contract, ContractStatus } from "@/lib/api/types";

const ALL = "__all__";

const STATUS_TABS: { value: string; labelKey: string; statuses?: ContractStatus[] }[] = [
  { value: ALL, labelKey: "common.all" },
  { value: "yangi", labelKey: "adminContracts.tabs.new", statuses: ["draft", "generated"] },
  { value: "imzolangan", labelKey: "adminContracts.tabs.signed", statuses: ["active"] },
  { value: "rad", labelKey: "adminContracts.tabs.rejected", statuses: ["revoked"] },
  { value: "arxiv", labelKey: "adminContracts.tabs.archive", statuses: ["expired"] },
];

export function ContractsPage() {
  const { t } = useTranslation();
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
      toast.error(e instanceof Error ? e.message : t("adminContracts.pdfDownloadFailed"));
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
            <h1 className="text-2xl font-semibold">{t("adminContracts.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("adminContracts.subtitle")}
            </p>
          </div>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          {t("adminContracts.newContract")}
        </Button>
      </div>

      <Tabs
        value={statusTab}
        onValueChange={(v) => {
          setStatusTab(v);
          const tab = STATUS_TABS.find((s) => s.value === v);
          setFilters((f) => ({ ...f, status: tab?.statuses }));
          setPage(1);
        }}
        className="mb-4"
      >
        <TabsList className="flex-wrap">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("adminContracts.searchPlaceholder")}
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
            title={t("adminContracts.emptyTitle")}
            description={t("adminContracts.emptyDescription")}
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
                  <TableHead>{t("adminContracts.colNumber")}</TableHead>
                  <TableHead>{t("adminContracts.colCompany")}</TableHead>
                  <TableHead className="w-[200px]">{t("adminContracts.colPeriod")}</TableHead>
                  <TableHead className="w-[130px]">{t("adminContracts.colCreated")}</TableHead>
                  <TableHead className="w-[140px]">{t("adminContracts.colContract")}</TableHead>
                  <TableHead className="w-[120px]">{t("common.status")}</TableHead>
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
                        {new Date(c.start_date).toLocaleDateString(dateLocale())} —{" "}
                        {new Date(c.end_date).toLocaleDateString(dateLocale())}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(c.created_at).toLocaleDateString(dateLocale())}
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
                          {t("adminContracts.pdfButton")}
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
                {t("common.total")}: <span className="font-medium text-foreground">{data.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("common.previous")}
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
                  {t("common.next")}
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
