import { Ban, Loader2, Plus, ShieldOff, Trash2, Users, Wrench } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RestrictionFormDialog } from "@/components/admin/access-restrictions/restriction-form-dialog";
import { formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { describeRequestError } from "@/components/attendance/request-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
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
  useAccessRestrictions,
  useDeactivateAccessRestriction,
  useDeleteAccessRestriction,
} from "@/lib/api/access-restrictions";
import type { AccessRestriction } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Pending = { action: "deactivate" | "delete"; item: AccessRestriction };

function statusKey(r: AccessRestriction): "effective" | "ended" | "inactive" {
  if (!r.is_active) return "inactive";
  return r.is_effective ? "effective" : "ended";
}

export function AccessRestrictionsPage() {
  const { t } = useTranslation();
  const locale = dateLocale();
  const [effectiveOnly, setEffectiveOnly] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const { data, isPending, isFetching, error } = useAccessRestrictions(effectiveOnly);
  const deactivate = useDeactivateAccessRestriction();
  const remove = useDeleteAccessRestriction();
  const items = data ?? [];

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      if (pending.action === "deactivate") {
        await deactivate.mutateAsync(pending.item.id);
        toast.success(t("adminAccessRestrictions.toastDeactivated"));
      } else {
        await remove.mutateAsync(pending.item.id);
        toast.success(t("adminAccessRestrictions.toastDeleted"));
      }
      setPending(null);
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
            <ShieldOff className="h-5 w-5 text-destructive" aria-hidden="true" />
            {t("adminAccessRestrictions.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("adminAccessRestrictions.subtitle")}</p>
        </div>
        <Button variant="destructive" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("adminAccessRestrictions.newButton")}
        </Button>
      </div>

      <div
        role="group"
        aria-label={t("adminAccessRestrictions.filterLabel")}
        className="inline-flex rounded-md border border-input p-0.5"
      >
        <Button
          type="button"
          size="sm"
          variant={effectiveOnly ? "secondary" : "ghost"}
          className="h-8"
          onClick={() => setEffectiveOnly(true)}
        >
          {t("adminAccessRestrictions.tabEffective")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={effectiveOnly ? "ghost" : "secondary"}
          className="h-8"
          onClick={() => setEffectiveOnly(false)}
        >
          {t("adminAccessRestrictions.tabAll")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {error ? (
          <Alert variant="destructive" className="m-3">
            <AlertDescription>{describeRequestError(error, t)}</AlertDescription>
          </Alert>
        ) : isPending ? (
          <CardContent className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        ) : items.length === 0 ? (
          <CardContent className="py-10">
            <EmptyState
              icon={Ban}
              title={t("adminAccessRestrictions.empty")}
              description={
                effectiveOnly
                  ? t("adminAccessRestrictions.emptyEffective")
                  : t("adminAccessRestrictions.emptyHint")
              }
            />
          </CardContent>
        ) : (
          <div className={cn("overflow-x-auto", isFetching && "opacity-70")} aria-busy={isFetching}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("adminAccessRestrictions.colTarget")}</TableHead>
                  <TableHead>{t("adminAccessRestrictions.colMode")}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t("adminAccessRestrictions.colMessage")}
                  </TableHead>
                  <TableHead>{t("adminAccessRestrictions.colUntil")}</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    {t("adminAccessRestrictions.colCreated")}
                  </TableHead>
                  <TableHead>{t("adminAccessRestrictions.colStatus")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => {
                  const status = statusKey(r);
                  return (
                    <TableRow key={r.id} className={cn(status !== "effective" && "opacity-70")}>
                      <TableCell className="min-w-[12rem]">
                        <div className="flex items-start gap-2">
                          <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="font-medium">{r.target_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {t(
                                r.target_type === "group"
                                  ? "adminAccessRestrictions.targetGroup"
                                  : "adminAccessRestrictions.targetUser",
                              )}
                              {r.target_detail && ` · ${r.target_detail}`}
                              {r.target_type === "group" && r.affected_count !== null && (
                                <>
                                  {" · "}
                                  {t("adminAccessRestrictions.affected", {
                                    count: r.affected_count,
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.mode === "restricted" ? "destructive" : "secondary"}
                          className="gap-1 whitespace-nowrap"
                        >
                          {r.mode === "restricted" ? (
                            <Ban className="h-3 w-3" />
                          ) : (
                            <Wrench className="h-3 w-3" />
                          )}
                          {t(`adminAccessRestrictions.mode.${r.mode}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden max-w-[18rem] md:table-cell">
                        <div className="line-clamp-2 text-sm">{r.message || "—"}</div>
                        {r.note && (
                          <div className="line-clamp-1 text-xs text-muted-foreground">
                            {t("adminAccessRestrictions.notePrefix")} {r.note}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.ends_at
                          ? formatTashkentDateTime(r.ends_at, locale)
                          : t("adminAccessRestrictions.noEnd")}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                        {r.created_by_name ?? "—"}
                        <br />
                        {formatTashkentDateTime(r.created_at, locale)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            status === "effective"
                              ? "destructive"
                              : status === "ended"
                                ? "outline"
                                : "secondary"
                          }
                          className="whitespace-nowrap"
                        >
                          {t(`adminAccessRestrictions.status.${status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.is_active && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPending({ action: "deactivate", item: r })}
                            >
                              {t("adminAccessRestrictions.deactivate")}
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setPending({ action: "delete", item: r })}
                            title={t("common.delete")}
                            aria-label={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <RestrictionFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <ConfirmDialog
        open={!!pending}
        title={
          pending?.action === "delete"
            ? t("adminAccessRestrictions.deleteConfirmTitle")
            : t("adminAccessRestrictions.deactivateConfirmTitle")
        }
        description={
          pending
            ? t(
                pending.action === "delete"
                  ? "adminAccessRestrictions.deleteConfirmDesc"
                  : "adminAccessRestrictions.deactivateConfirmDesc",
                { name: pending.item.target_name ?? "" },
              )
            : undefined
        }
        confirmText={
          pending?.action === "delete"
            ? t("common.delete")
            : t("adminAccessRestrictions.deactivate")
        }
        variant={pending?.action === "delete" ? "destructive" : "default"}
        isPending={deactivate.isPending || remove.isPending}
        onConfirm={() => void handleConfirm()}
        onClose={() => setPending(null)}
      />
      {(deactivate.isPending || remove.isPending) && (
        <span className="sr-only" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      )}
    </div>
  );
}
