import { HTTPError } from "ky";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

import { AdminFormDialog } from "@/components/admin/admins/admin-form-dialog";
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
import { useAdmins, useDeleteAdmin, type AdminFilters } from "@/lib/api/admins";
import type { Admin } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

const ALL = "__all__";

export function AdminsPage() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState<AdminFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch || undefined }));
    setPage(1);
  }, [debouncedSearch]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [deleting, setDeleting] = useState<Admin | null>(null);

  const { data, isPending, error, isFetching } = useAdmins(filters, page, pageSize);
  const deleteMut = useDeleteAdmin();

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

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
          <AlertDescription>
            {t("adminAdmins.superAdminOnly")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("adminAdmins.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("adminAdmins.subtitle")}
            </p>
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
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="min-w-[240px] flex-1 max-w-xs"
        />
        <Select
          value={
            filters.is_active === undefined
              ? ALL
              : filters.is_active
                ? "true"
                : "false"
          }
          onValueChange={(v) => {
            setFilters({
              ...filters,
              is_active: v === ALL ? undefined : v === "true",
            });
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("adminAdmins.allStatuses")}</SelectItem>
            <SelectItem value="true">{t("adminAdmins.statusActive")}</SelectItem>
            <SelectItem value="false">{t("adminAdmins.statusBlocked")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPending && !data && <TableSkeleton columns={6} rows={4} />}
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
        <>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.fullName")}</TableHead>
                  <TableHead>{t("adminAdmins.colUsername")}</TableHead>
                  <TableHead>{t("adminAdmins.colEmail")}</TableHead>
                  <TableHead className="w-[140px]">{t("adminAdmins.colRole")}</TableHead>
                  <TableHead className="w-[100px]">{t("common.status")}</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((a) => (
                  <TableRow
                    key={a.id}
                    onClick={() => setEditing(a)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="font-medium">{a.full_name}</div>
                      {a.phone && (
                        <div className="text-xs text-muted-foreground">{a.phone}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{a.username}</TableCell>
                    <TableCell className="text-sm">{a.email ?? "—"}</TableCell>
                    <TableCell>
                      {a.role === "super_admin" ? (
                        <Badge variant="default">{t("adminAdmins.roleSuperAdmin")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("adminAdmins.roleAdmin")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.is_active ? (
                        <Badge variant="success">{t("adminAdmins.statusActive")}</Badge>
                      ) : (
                        <Badge variant="destructive">{t("adminAdmins.statusBlocked")}</Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {a.id !== me.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(a);
                          }}
                          title={t("common.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
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

      <AdminFormDialog
        open={creating || !!editing}
        existing={editing}
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
