import { AlertTriangle, Calculator, Loader2, Search, Smartphone, Unlink } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { GroupSearchSelect } from "@/components/admin/assignments/group-search-select";
import { StudentDetailDialog } from "@/components/admin/students/student-detail-dialog";
import { ListPagination } from "@/components/admin/students/list-pagination";
import { formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { describeRequestError } from "@/components/attendance/request-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  useBulkResetDevices,
  useResetStudentDevice,
  useStudents,
  type DeviceResetRequest,
  type DeviceResetResult,
  type DeviceResetScope,
} from "@/lib/api/students";
import type { Student, UUID } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

const PAGE_SIZE = 20;
const ALL = "__all__";

/**
 * Bog'langan qurilmalar: ro'yxat, bittasini uzish va ommaviy uzish (barchasi / fakultet /
 * guruh / tanlanganlar). Uzilgan talaba keyingi kirishda qayta autentifikatsiya qiladi va
 * yangi qurilmasi bog'lanadi. Har bir amal audit jurnaliga yoziladi.
 */
export function DevicesPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const facultyLocked = user?.role === "admin" && !!user.faculty_id;
  const faculties = useAllFaculties();

  // Ro'yxat filtrlari
  const [facultyFilter, setFacultyFilter] = useState<string>(ALL);
  const [groupFilter, setGroupFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 300);
  const [page, setPage] = useState(1);
  const list = useStudents(
    {
      has_device: true,
      ...(facultyFilter !== ALL ? { faculty_id: facultyFilter } : {}),
      ...(groupFilter ? { group_id: groupFilter } : {}),
      ...(search ? { search } : {}),
    },
    page,
    PAGE_SIZE,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [opened, setOpened] = useState<Student | null>(null);
  const [single, setSingle] = useState<Student | null>(null);
  const resetOne = useResetStudentDevice();

  // Ommaviy uzish
  const [scope, setScope] = useState<DeviceResetScope>(facultyLocked ? "faculty" : "group");
  const [scopeFaculty, setScopeFaculty] = useState(user?.faculty_id ?? "");
  const [scopeGroup, setScopeGroup] = useState("");
  const [preview, setPreview] = useState<DeviceResetResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const bulk = useBulkResetDevices();

  const scopeReady =
    scope === "all" ||
    (scope === "faculty" && !!scopeFaculty) ||
    (scope === "group" && !!scopeGroup) ||
    (scope === "students" && selectedIds.size > 0);

  const request = (dryRun: boolean): DeviceResetRequest => ({
    scope,
    ...(scope === "faculty" ? { faculty_id: scopeFaculty } : {}),
    ...(scope === "group" ? { group_id: scopeGroup } : {}),
    ...(scope === "students" ? { student_ids: [...selectedIds] as UUID[] } : {}),
    dry_run: dryRun,
    ...(dryRun ? {} : { confirm: true }),
  });

  const resetPreview = () => setPreview(null);

  const handleCount = async () => {
    try {
      const res = await bulk.mutateAsync(request(true));
      setPreview(res);
      if (res.bound === 0) toast.info(t("devicesPage.noneBound"));
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const handleApply = async () => {
    try {
      const res = await bulk.mutateAsync(request(false));
      toast.success(t("devicesPage.toastReset", { n: res.reset }));
      setConfirmOpen(false);
      setPreview(null);
      setSelectedIds(new Set());
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const handleSingle = async () => {
    if (!single) return;
    try {
      await resetOne.mutateAsync(single.id);
      toast.success(t("devicesPage.toastSingle", { name: single.full_name }));
      setSingle(null);
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const items = list.data?.items ?? [];
  const pageIds = items.map((s) => s.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
  const allOnPage = pageIds.length > 0 && selectedOnPage === pageIds.length;
  // Tanlov o'zgarsa "tanlanganlar" bo'yicha hisob eskiradi
  const toggle = (id: string) => {
    if (scope === "students") resetPreview();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const togglePage = (checked: boolean) => {
    if (scope === "students") resetPreview();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const scopes: DeviceResetScope[] = facultyLocked
    ? ["faculty", "group", "students"]
    : ["all", "faculty", "group", "students"];

  return (
    <div className="container max-w-6xl py-4 sm:py-8">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">{t("devicesPage.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {list.data
              ? t("devicesPage.subtitleCount", { n: list.data.total })
              : t("devicesPage.subtitle")}
          </p>
        </div>
      </div>

      {/* Ommaviy uzish */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Unlink className="h-4 w-4 text-destructive" />
            {t("devicesPage.bulkTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label={t("devicesPage.scopeLabel")}
          >
            {scopes.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={scope === k}
                onClick={() => {
                  setScope(k);
                  resetPreview();
                }}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  scope === k
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                {k === "students"
                  ? t("devicesPage.scope.students", { n: selectedIds.size })
                  : t(`devicesPage.scope.${k}`)}
              </button>
            ))}
          </div>
          {scope === "faculty" && (
            <Select
              value={scopeFaculty || undefined}
              onValueChange={(v) => {
                setScopeFaculty(v);
                resetPreview();
              }}
              disabled={facultyLocked}
            >
              <SelectTrigger className="sm:max-w-sm" aria-label={t("common.faculty")}>
                <SelectValue placeholder={t("reassign.pickFaculty")} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {(faculties.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {scope === "group" && (
            <div className="sm:max-w-sm">
              <GroupSearchSelect
                value={scopeGroup}
                onValueChange={(v) => {
                  setScopeGroup(v);
                  resetPreview();
                }}
                placeholder={t("reassign.pickGroup")}
              />
            </div>
          )}
          {scope === "students" && selectedIds.size === 0 && (
            <p className="text-xs text-muted-foreground">{t("devicesPage.selectHint")}</p>
          )}

          {preview && (
            <Alert className={cn(preview.bound > 0 && "border-destructive/40")}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t("devicesPage.previewText", {
                  total: preview.students_total,
                  bound: preview.bound,
                })}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => void handleCount()}
              disabled={!scopeReady || bulk.isPending}
            >
              {bulk.isPending && !confirmOpen ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              {t("devicesPage.count")}
            </Button>
            <Button
              variant="destructive"
              disabled={!preview || preview.bound === 0 || bulk.isPending}
              onClick={() => {
                setUnderstood(false);
                setConfirmOpen(true);
              }}
            >
              <Unlink className="h-4 w-4" />
              {t("devicesPage.resetN", { n: preview?.bound ?? 0 })}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ro'yxat */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder={t("devicesPage.searchPlaceholder")}
            aria-label={t("devicesPage.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        {!facultyLocked && (
          <Select
            value={facultyFilter}
            onValueChange={(v) => {
              setFacultyFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[220px]" aria-label={t("common.faculty")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>{t("devicesPage.allFaculties")}</SelectItem>
              {(faculties.data ?? []).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="w-full sm:w-[220px]">
          <GroupSearchSelect
            value={groupFilter}
            onValueChange={(v) => {
              setGroupFilter(v);
              setPage(1);
            }}
            placeholder={t("adminAssignments.allGroups")}
            noneLabel={t("adminAssignments.allGroups")}
          />
        </div>
      </div>

      {list.isPending && <TableSkeleton rows={6} columns={5} />}
      {list.error && (
        <Alert variant="destructive">
          <AlertDescription>{list.error.message}</AlertDescription>
        </Alert>
      )}
      {list.data && list.data.items.length === 0 && (
        <EmptyState
          icon={Smartphone}
          title={t("devicesPage.emptyTitle")}
          description={t("devicesPage.emptyDescription")}
          accent="muted"
        />
      )}
      {list.data && list.data.items.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-primary"
                      aria-label={t("studentsStudentsTable.selectAllOnPage")}
                      checked={allOnPage}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedOnPage > 0 && !allOnPage;
                      }}
                      onChange={(e) => togglePage(e.target.checked)}
                    />
                  </TableHead>
                  <TableHead>{t("common.student")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("common.group")}</TableHead>
                  <TableHead>{t("devicesPage.device")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("devicesPage.boundAt")}</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setOpened(s)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-primary"
                        aria-label={t("studentsStudentsTable.selectRowNamed", {
                          name: s.full_name,
                        })}
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggle(s.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{s.full_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{s.username}</div>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {s.group_name ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm">
                      <span className="line-clamp-2 break-words">{s.device_label ?? "—"}</span>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {s.device_bound_at
                        ? formatTashkentDateTime(s.device_bound_at, dateLocale())
                        : "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setSingle(s)}
                        aria-label={t("devicesPage.resetOne", { name: s.full_name })}
                        title={t("devicesPage.resetOne", { name: s.full_name })}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ListPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={list.data.total}
            onPageChange={setPage}
            disabled={list.isFetching}
          />
        </div>
      )}

      <StudentDetailDialog student={opened} onClose={() => setOpened(null)} />

      <ConfirmDialog
        open={!!single}
        title={t("devicesPage.singleTitle")}
        description={single ? t("devicesPage.singleText", { name: single.full_name }) : undefined}
        confirmText={t("devicesPage.resetConfirm")}
        variant="destructive"
        isPending={resetOne.isPending}
        onConfirm={() => void handleSingle()}
        onClose={() => setSingle(null)}
      />

      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => !o && !bulk.isPending && setConfirmOpen(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("devicesPage.confirmTitle")}
            </DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {t("devicesPage.confirmText", { n: preview?.bound ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2">
            <input
              id="dev-understood"
              type="checkbox"
              className="mt-0.5 h-4 w-4 cursor-pointer accent-destructive"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
            />
            <Label htmlFor="dev-understood" className="cursor-pointer text-sm font-normal">
              {t("devicesPage.understood")}
            </Label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={bulk.isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleApply()}
              disabled={!understood || bulk.isPending}
            >
              {bulk.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4" />
              )}
              {t("devicesPage.resetN", { n: preview?.bound ?? 0 })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
