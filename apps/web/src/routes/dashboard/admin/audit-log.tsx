import { ChevronLeft, ChevronRight, History, Shield } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  useAuditLogs,
  type AuditLogFilters,
} from "@/lib/api/audit-logs";

const ALL = "__all__";

const ACTION_LABEL: Record<string, string> = {
  create: "Yaratdi",
  update: "Tahrirladi",
  delete: "O'chirdi",
  approve: "Tasdiqladi",
  reject: "Rad etdi",
  override: "Override",
  login_reset: "Parol reset",
};

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  approve: "default",
  reject: "destructive",
  override: "destructive",
  login_reset: "secondary",
};

const ENTITY_LABEL: Record<string, string> = {
  student: "Talaba",
  supervisor: "Supervizor",
  contract: "Shartnoma",
  attendance_day: "Davomat",
  final_report: "Yakuniy hisobot",
  practice_assignment: "Biriktirish",
  task_template: "Topshiriq shabloni",
  document: "Hujjat",
  organization: "Tashkilot",
  area: "Hudud",
  admin: "Admin",
  system_settings: "Sozlama",
};

export function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const { data, isPending, error } = useAuditLogs(filters, page, pageSize);

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Adminlar va super adminlarning muhim amallari tarixi
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={filters.action ?? ALL}
          onValueChange={(v) => {
            setFilters((f) => ({ ...f, action: v === ALL ? undefined : v }));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Amal turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Barcha amallar</SelectItem>
            {Object.keys(ACTION_LABEL).map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_LABEL[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.entity_type ?? ALL}
          onValueChange={(v) => {
            setFilters((f) => ({ ...f, entity_type: v === ALL ? undefined : v }));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Entity turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Barcha entity</SelectItem>
            {Object.keys(ENTITY_LABEL).map((e) => (
              <SelectItem key={e} value={e}>
                {ENTITY_LABEL[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending && <TableSkeleton rows={10} columns={5} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={History}
          title="Hozircha yozuv yo'q"
          description="Adminlar amal qilganida shu yerda paydo bo'ladi"
          accent="muted"
        />
      )}

      {data && data.items.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Vaqt</TableHead>
                <TableHead className="w-[160px]">Kim</TableHead>
                <TableHead className="w-[120px]">Amal</TableHead>
                <TableHead className="w-[140px]">Entity</TableHead>
                <TableHead>Tafsilot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("uz-UZ", {
                      year: "2-digit",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{log.actor_name ?? "—"}</div>
                    {log.actor_role && (
                      <div className="text-xs text-muted-foreground">{log.actor_role}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACTION_VARIANT[log.action] ?? "outline"}>
                      {ACTION_LABEL[log.action] ?? log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {ENTITY_LABEL[log.entity_type] ?? log.entity_type}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{log.summary}</div>
                    {log.metadata_json && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {JSON.stringify(log.metadata_json)}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} / {data.total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
