import { ArrowRight, Download, History, Loader2, Lock, Search, Shield } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { fieldLabel, formatChangeValue } from "@/components/admin/audit/change-format";
import { ListPagination } from "@/components/admin/students/list-pagination";
import { formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useDebounce } from "@/hooks/use-debounce";
import { dateLocale } from "@/i18n";
import { useAllFaculties } from "@/lib/api/academic";
import {
  downloadAuditLogsXlsx,
  useAuditActions,
  useAuditLogs,
  type AuditChange,
  type AuditLog,
  type AuditLogFilters,
} from "@/lib/api/audit-logs";
import type { ISODate, UUID } from "@/lib/api/types";

const ALL = "__all__";
const PAGE_SIZE = 30;
/** Har bir muvaffaqiyatli kirish ham yoziladi — standart ko'rinishda yashiriladi */
const HIDDEN_BY_DEFAULT = ["login"];

const ACTION_LABEL_KEY: Record<string, string> = {
  create: "adminAuditLog.action.create",
  update: "adminAuditLog.action.update",
  delete: "adminAuditLog.action.delete",
  approve: "adminAuditLog.action.approve",
  reject: "adminAuditLog.action.reject",
  override: "adminAuditLog.action.override",
  login_reset: "adminAuditLog.action.loginReset",
  import: "adminAuditLog.action.import",
  export: "adminAuditLog.action.export",
  bulk_update: "adminAuditLog.action.bulkUpdate",
  revert: "adminAuditLog.action.revert",
  grade: "adminAuditLog.action.grade",
  finalize: "adminAuditLog.action.finalize",
  reassign: "adminAuditLog.action.reassign",
  broadcast: "adminAuditLog.action.broadcast",
  device_reset: "adminAuditLog.action.deviceReset",
  login: "adminAuditLog.action.login",
  login_failed: "adminAuditLog.action.loginFailed",
};

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  approve: "default",
  reject: "destructive",
  override: "destructive",
  login_reset: "secondary",
  import: "secondary",
  export: "outline",
  bulk_update: "secondary",
  revert: "secondary",
  grade: "default",
  finalize: "default",
  reassign: "default",
  broadcast: "secondary",
  device_reset: "destructive",
  login: "outline",
  login_failed: "destructive",
};

const ENTITY_LABEL_KEY: Record<string, string> = {
  student: "common.student",
  student_credentials: "adminAuditLog.entity.studentCredentials",
  supervisor: "common.supervisor",
  contract: "adminAuditLog.entity.contract",
  attendance_day: "adminAuditLog.entity.attendanceDay",
  final_report: "adminAuditLog.entity.finalReport",
  practice_assignment: "adminAuditLog.entity.practiceAssignment",
  task_template: "adminAuditLog.entity.taskTemplate",
  document: "adminAuditLog.entity.document",
  organization: "common.organization",
  area: "common.area",
  admin: "adminAuditLog.entity.admin",
  access_restriction: "adminAuditLog.entity.accessRestriction",
  system_settings: "adminAuditLog.entity.systemSettings",
  database: "adminAuditLog.entity.database",
  broadcast: "adminAuditLog.entity.broadcast",
  session: "adminAuditLog.entity.session",
  audit_log: "adminAuditLog.entity.auditLog",
};

const ROLE_LABEL_KEY: Record<string, string> = {
  super_admin: "adminAdminSidebar.roles.superAdmin",
  admin: "adminAdminSidebar.roles.admin",
  supervisor: "common.supervisor",
  student: "common.student",
};

function isChange(v: unknown): v is AuditChange {
  return !!v && typeof v === "object" && "field" in v;
}

/** `metadata_json` dan eski → yangi qiymatlar: `changes` yoki `before`/`after` juftligi. */
function extractChanges(meta: Record<string, unknown> | null): AuditChange[] {
  if (!meta) return [];
  const changes = meta.changes;
  if (Array.isArray(changes)) {
    return changes.filter(isChange).filter((c) => "before" in c || "after" in c);
  }
  const before = meta.before;
  const after = meta.after;
  if (before && after && typeof before === "object" && typeof after === "object") {
    const b = before as Record<string, unknown>;
    const a = after as Record<string, unknown>;
    return Object.keys(a)
      .filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]))
      .map((k) => ({ field: k, before: b[k], after: a[k] }));
  }
  return [];
}

function affectedOf(meta: Record<string, unknown> | null): {
  n: number | null;
  result: string | null;
} {
  if (!meta) return { n: null, result: null };
  const n = typeof meta.affected_count === "number" ? meta.affected_count : null;
  const result = typeof meta.result === "string" ? meta.result : null;
  return { n, result };
}

type BulkItem = { student?: string; ok?: boolean; error?: string | null; changes?: AuditChange[] };

function bulkItemsOf(meta: Record<string, unknown> | null): BulkItem[] {
  const items = meta?.items;
  return Array.isArray(items)
    ? (items.filter((i) => i && typeof i === "object") as BulkItem[])
    : [];
}

function ChangeLine({
  c,
}: {
  c: AuditChange & { before_label?: string | null; after_label?: string | null };
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="font-medium">{fieldLabel(c.field)}:</span>
      <span className="text-muted-foreground line-through decoration-destructive/60">
        {formatChangeValue(c.field, c.before, c.before_label)}
      </span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <span>{formatChangeValue(c.field, c.after, c.after_label)}</span>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant={ACTION_VARIANT[action] ?? "outline"} className="whitespace-nowrap">
      {ACTION_LABEL_KEY[action] ? t(ACTION_LABEL_KEY[action]!) : action}
    </Badge>
  );
}

function AuditDetail({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const { t } = useTranslation();
  const meta = log.metadata_json;
  const changes = extractChanges(meta);
  const { n, result } = affectedOf(meta);
  const items = bulkItemsOf(meta);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
            <ActionBadge action={log.action} />
            <span className="break-words text-base">{log.summary}</span>
          </DialogTitle>
          <DialogDescription>
            {formatTashkentDateTime(log.created_at, dateLocale())}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-lg border border-border bg-muted/20 p-3 text-xs">
          <dt className="text-muted-foreground">{t("adminAuditLog.whoColumn")}</dt>
          <dd>
            {log.actor_name ?? "—"}
            {log.actor_role && (
              <span className="text-muted-foreground">
                {" · "}
                {ROLE_LABEL_KEY[log.actor_role]
                  ? t(ROLE_LABEL_KEY[log.actor_role]!)
                  : log.actor_role}
              </span>
            )}
          </dd>
          <dt className="text-muted-foreground">{t("adminAuditLog.entityColumn")}</dt>
          <dd className="break-all">
            {ENTITY_LABEL_KEY[log.entity_type]
              ? t(ENTITY_LABEL_KEY[log.entity_type]!)
              : log.entity_type}
            {log.entity_id && (
              <span className="font-mono text-muted-foreground"> · {log.entity_id}</span>
            )}
          </dd>
          {n !== null && (
            <>
              <dt className="text-muted-foreground">{t("adminAuditLog.affected")}</dt>
              <dd>
                {n}
                {result && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {t(`adminAuditLog.result.${result}`, { defaultValue: result })}
                  </span>
                )}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">IP</dt>
          <dd className="font-mono">{log.ip ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("adminAuditLog.userAgent")}</dt>
          <dd className="break-all">{log.user_agent ?? "—"}</dd>
        </dl>

        {changes.length > 0 && (
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">{t("adminAuditLog.changesTitle")}</h3>
            <div className="space-y-1 rounded-lg border border-border p-3">
              {changes.map((c) => (
                <ChangeLine key={c.field} c={c} />
              ))}
            </div>
          </section>
        )}

        {items.length > 0 && (
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">
              {t("adminAuditLog.itemsTitle", { n: items.length })}
            </h3>
            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border text-xs">
              {items.map((it, i) => (
                <li key={i} className="space-y-0.5 px-3 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{it.student ?? "—"}</span>
                    {it.ok === false && (
                      <Badge variant="destructive">{t("adminAuditLog.itemFailed")}</Badge>
                    )}
                  </div>
                  {it.error && <div className="text-destructive">{it.error}</div>}
                  {(it.changes ?? []).filter(isChange).map((c) => (
                    <ChangeLine key={c.field} c={c} />
                  ))}
                </li>
              ))}
            </ul>
          </section>
        )}

        {meta && (
          <details className="rounded-lg border border-border p-3 text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              {t("adminAuditLog.rawData")}
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all">
              {JSON.stringify(meta, null, 2)}
            </pre>
          </details>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RowSummary({ log }: { log: AuditLog }) {
  const { t } = useTranslation();
  const changes = extractChanges(log.metadata_json);
  const { n } = affectedOf(log.metadata_json);
  return (
    <div className="min-w-0 space-y-1">
      <div className="break-words">{log.summary}</div>
      {changes.slice(0, 2).map((c) => (
        <ChangeLine key={c.field} c={c} />
      ))}
      {changes.length > 2 && (
        <div className="text-xs text-muted-foreground">
          {t("adminAuditLog.moreChanges", { n: changes.length - 2 })}
        </div>
      )}
      {n !== null && (
        <Badge variant="outline" className="font-normal">
          {t("adminAuditLog.affectedN", { n })}
        </Badge>
      )}
    </div>
  );
}

export function AuditLogPage() {
  const { t } = useTranslation();
  const faculties = useAllFaculties();
  const actions = useAuditActions();
  const [action, setAction] = useState<string>(ALL);
  const [entity, setEntity] = useState<string>(ALL);
  const [facultyId, setFacultyId] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 300);
  const [hideLogins, setHideLogins] = useState(true);
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);

  const rangeInvalid = !!dateFrom && !!dateTo && dateTo < dateFrom;
  const filters: AuditLogFilters = {
    ...(action !== ALL ? { action } : {}),
    ...(entity !== ALL ? { entity_type: entity } : {}),
    ...(facultyId !== ALL ? { faculty_id: facultyId as UUID } : {}),
    ...(dateFrom && !rangeInvalid ? { date_from: dateFrom as ISODate } : {}),
    ...(dateTo && !rangeInvalid ? { date_to: dateTo as ISODate } : {}),
    ...(search ? { search } : {}),
    // Aniq amal tanlansa yashirish qo'llanmaydi (masalan, "Kirish" ni ko'rish uchun)
    ...(hideLogins && action === ALL ? { exclude_action: HIDDEN_BY_DEFAULT } : {}),
  };
  const { data, isPending, error, isFetching } = useAuditLogs(filters, page, PAGE_SIZE);

  const update = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const actionOptions = Array.from(
    new Set([...Object.keys(ACTION_LABEL_KEY), ...(actions.data ?? [])]),
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAuditLogsXlsx(filters);
      toast.success(t("adminAuditLog.exported"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setExporting(false);
    }
  };

  const hasFilters =
    action !== ALL ||
    entity !== ALL ||
    facultyId !== ALL ||
    !!dateFrom ||
    !!dateTo ||
    !!searchInput;

  return (
    <div className="container max-w-7xl py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">{t("adminAuditLog.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("adminAuditLog.subtitle")}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {t("adminAuditLog.exportExcel")}
        </Button>
      </div>

      <Alert className="mb-4 py-2.5">
        <Lock className="h-4 w-4" />
        <AlertDescription className="text-xs">{t("adminAuditLog.immutableNote")}</AlertDescription>
      </Alert>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => update(() => setSearchInput(e.target.value))}
            placeholder={t("adminAuditLog.searchPlaceholder")}
            aria-label={t("adminAuditLog.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={action} onValueChange={(v) => update(() => setAction(v))}>
          <SelectTrigger aria-label={t("adminAuditLog.actionFilter")}>
            <SelectValue placeholder={t("adminAuditLog.actionFilter")} />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            <SelectItem value={ALL}>{t("adminAuditLog.allActions")}</SelectItem>
            {actionOptions.map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_LABEL_KEY[a] ? t(ACTION_LABEL_KEY[a]!) : a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={(v) => update(() => setEntity(v))}>
          <SelectTrigger aria-label={t("adminAuditLog.entityFilter")}>
            <SelectValue placeholder={t("adminAuditLog.entityFilter")} />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            <SelectItem value={ALL}>{t("adminAuditLog.allEntities")}</SelectItem>
            {Object.keys(ENTITY_LABEL_KEY).map((e) => (
              <SelectItem key={e} value={e}>
                {t(ENTITY_LABEL_KEY[e]!)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={facultyId} onValueChange={(v) => update(() => setFacultyId(v))}>
          <SelectTrigger aria-label={t("common.faculty")}>
            <SelectValue placeholder={t("common.faculty")} />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            <SelectItem value={ALL}>{t("devicesPage.allFaculties")}</SelectItem>
            {(faculties.data ?? []).map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label htmlFor="al-from" className="w-10 shrink-0 text-xs text-muted-foreground">
            {t("adminAuditLog.from")}
          </Label>
          <Input
            id="al-from"
            type="date"
            value={dateFrom}
            onChange={(e) => update(() => setDateFrom(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="al-to" className="w-10 shrink-0 text-xs text-muted-foreground">
            {t("adminAuditLog.to")}
          </Label>
          <Input
            id="al-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => update(() => setDateTo(e.target.value))}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={hideLogins}
            onChange={(e) => update(() => setHideLogins(e.target.checked))}
          />
          {t("adminAuditLog.hideLogins")}
        </label>
        {hasFilters && (
          <Button
            variant="ghost"
            className="justify-self-start"
            onClick={() =>
              update(() => {
                setAction(ALL);
                setEntity(ALL);
                setFacultyId(ALL);
                setDateFrom("");
                setDateTo("");
                setSearchInput("");
              })
            }
          >
            {t("common.clear")}
          </Button>
        )}
      </div>
      {rangeInvalid && (
        <p className="mb-3 text-xs text-destructive">{t("bulkEdit.datesInvalid")}</p>
      )}

      {isPending && <TableSkeleton rows={10} columns={5} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={History}
          title={t("adminAuditLog.emptyTitle")}
          description={t("adminAuditLog.emptyDescription")}
          accent="muted"
        />
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-3">
          {/* Telefon: kartalar */}
          <ul className="space-y-2 md:hidden">
            {data.items.map((log) => (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => setOpened(log)}
                  className="w-full space-y-1.5 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <ActionBadge action={log.action} />
                    <span className="text-xs text-muted-foreground">
                      {formatTashkentDateTime(log.created_at, dateLocale())}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {log.actor_name ?? "—"}
                    {" · "}
                    {ENTITY_LABEL_KEY[log.entity_type]
                      ? t(ENTITY_LABEL_KEY[log.entity_type]!)
                      : log.entity_type}
                  </div>
                  <RowSummary log={log} />
                </button>
              </li>
            ))}
          </ul>

          {/* Kompyuter: jadval */}
          <div className="hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">{t("adminAuditLog.timeColumn")}</TableHead>
                  <TableHead className="w-[170px]">{t("adminAuditLog.whoColumn")}</TableHead>
                  <TableHead className="w-[140px]">{t("adminAuditLog.actionColumn")}</TableHead>
                  <TableHead className="w-[140px]">{t("adminAuditLog.entityColumn")}</TableHead>
                  <TableHead>{t("adminAuditLog.detailColumn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer align-top"
                    onClick={() => setOpened(log)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpened(log);
                      }
                    }}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatTashkentDateTime(log.created_at, dateLocale())}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{log.actor_name ?? "—"}</div>
                      {log.actor_role && (
                        <div className="text-xs text-muted-foreground">
                          {ROLE_LABEL_KEY[log.actor_role]
                            ? t(ROLE_LABEL_KEY[log.actor_role]!)
                            : log.actor_role}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={log.action} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {ENTITY_LABEL_KEY[log.entity_type]
                        ? t(ENTITY_LABEL_KEY[log.entity_type]!)
                        : log.entity_type}
                    </TableCell>
                    <TableCell className="text-sm">
                      <RowSummary log={log} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            onPageChange={setPage}
            disabled={isFetching}
          />
        </div>
      )}

      {opened && <AuditDetail log={opened} onClose={() => setOpened(null)} />}
    </div>
  );
}
