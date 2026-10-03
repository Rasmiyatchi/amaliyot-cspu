import { HTTPError } from "ky";
import { Pencil, Plus, School, Shield, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminFormDialog } from "@/components/admin/admins/admin-form-dialog";
import {
  isPermissionModuleId,
  permissionNameKey,
} from "@/components/admin/admins/permission-modules";
import { ListPagination } from "@/components/admin/students/list-pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { useDebounce } from "@/hooks/use-debounce";
import { useAdmin, useAdmins, useDeleteAdmin } from "@/lib/api/admins";
import type { Admin } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

const ALL = "__all__";
const PAGE_SIZE = 50;

type StatusFilter = typeof ALL | "true" | "false";

function PermissionsCell({ admin }: { admin: Admin }) {
  const { t } = useTranslation();
  if (admin.role === "super_admin") {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-50/50 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
      >
        {t("adminAdmins.fullAccess")}
      </Badge>
    );
  }
  const modules = (admin.permissions ?? []).filter(isPermissionModuleId);
  // Bo'sh ro'yxat = hech qanday modulga kirish yo'q (backend require_permission → 403)
  if (modules.length === 0) {
    return <Badge variant="destructive">{t("adminAdmins.noAccess")}</Badge>;
  }
  const names = modules.map((id) => t(permissionNameKey(id))).join(", ");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary" className="font-mono text-xs">
        {t("adminAdmins.modulesCount", { n: modules.length })}
      </Badge>
      <span className="max-w-[180px] truncate text-[11px] text-muted-foreground" title={names}>
        {names}
      </span>
    </div>
  );
}

export function AdminsPage() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 300);
  const [status, setStatus] = useState<StatusFilter>(ALL);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [deleting, setDeleting] = useState<Admin | null>(null);

  // Qidiruv/filtr o'zgarsa birinchi sahifaga qaytamiz (render paytida — effektsiz)
  const filterKey = `${search}|${status}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const { data, isPending, error, isFetching } = useAdmins(
    {
      search: search || undefined,
      is_active: status === ALL ? undefined : status === "true",
    },
    page,
    PAGE_SIZE,
  );
  // Tahrirlash dialogi doim yangi ma'lumot bilan (login o'zgargach ham)
  const editingDetail = useAdmin(editing?.id ?? null);
  const editingAdmin = editing ? (editingDetail.data ?? editing) : null;
  const deleteMut = useDeleteAdmin();

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast.success(t("common.deleted"));
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  // Faqat super_admin bu sahifaga kiradi (router-level), lekin guard
  if (me?.role !== "super_admin") {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertDescription>{t("adminAdmins.superAdminOnly")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">{t("adminAdmins.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("adminAdmins.subtitle")}</p>
          </div>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          {t("adminAdmins.newAdmin")}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("adminAdmins.searchPlaceholder")}
          aria-label={t("adminAdmins.searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="min-w-0 flex-1 sm:max-w-xs"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]" aria-label={t("common.status")}>
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("adminAdmins.allStatuses")}</SelectItem>
            <SelectItem value="true">{t("adminAdmins.statusActive")}</SelectItem>
            <SelectItem value="false">{t("adminAdmins.statusBlocked")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPending && !data && <TableSkeleton columns={7} rows={4} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Shield}
            title={t("adminAdmins.emptyTitle")}
            description={t("adminAdmins.emptyDescription")}
          />
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.fullName")}</TableHead>
                <TableHead>{t("adminAdmins.colUsername")}</TableHead>
                <TableHead className="w-[120px]">{t("adminAdmins.colRole")}</TableHead>
                <TableHead className="min-w-[170px]">{t("adminAdmins.colFaculty")}</TableHead>
                <TableHead className="min-w-[180px]">{t("adminAdmins.colPermissions")}</TableHead>
                <TableHead className="w-[100px]">{t("common.status")}</TableHead>
                <TableHead className="w-[96px]">
                  <span className="sr-only">{t("common.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((a) => (
                <TableRow key={a.id} onClick={() => setEditing(a)} className="cursor-pointer">
                  <TableCell>
                    <div className="font-medium">{a.full_name}</div>
                    {a.email && <div className="text-xs text-muted-foreground">{a.email}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{a.username}</TableCell>
                  <TableCell>
                    {a.role === "super_admin" ? (
                      <Badge variant="default">{t("adminAdmins.roleSuperAdmin")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("adminAdmins.roleAdmin")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.role === "super_admin" ? (
                      <span className="text-xs italic text-muted-foreground">
                        {t("adminAdmins.allFaculties")}
                      </span>
                    ) : a.faculty_name ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-indigo-300 bg-indigo-50/50 text-xs font-medium text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
                      >
                        <School className="h-3 w-3 shrink-0" />
                        <span className="max-w-[160px] truncate" title={a.faculty_name}>
                          {a.faculty_name}
                        </span>
                      </Badge>
                    ) : (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {t("adminAdmins.allFaculties")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PermissionsCell admin={a} />
                  </TableCell>
                  <TableCell>
                    {a.is_active ? (
                      <Badge variant="success">{t("adminAdmins.statusActive")}</Badge>
                    ) : (
                      <Badge variant="destructive">{t("adminAdmins.statusBlocked")}</Badge>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => setEditing(a)}
                        aria-label={t("common.edit")}
                        title={t("common.edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {a.id !== me.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleting(a)}
                          aria-label={t("common.delete")}
                          title={t("common.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && (
        <ListPagination
          className="mt-3"
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
          disabled={isFetching}
        />
      )}

      <AdminFormDialog
        open={creating || !!editingAdmin}
        existing={editingAdmin}
        currentUserId={me.id}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title={t("adminAdmins.deleteTitle")}
        description={
          deleting
            ? t("adminAdmins.deleteConfirm", {
                name: deleting.full_name,
                username: deleting.username,
              })
            : ""
        }
        variant="destructive"
        confirmText={t("common.delete")}
        isPending={deleteMut.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
