import {
  ArrowUpRight,
  Bell,
  CheckCheck,
  Inbox,
  Loader2,
  MailOpen,
  Megaphone,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ListPagination } from "@/components/admin/students/list-pagination";
import { formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { describeRequestError } from "@/components/attendance/request-error";
import {
  NOTIFICATION_ACCENTS,
  NOTIFICATION_DATA_FIELDS,
  NOTIFICATION_ICONS,
  NOTIFICATION_TYPES,
  notificationTypeKey,
  relatedLinkFor,
} from "@/components/notifications/notification-meta";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useMediaQuery } from "@/hooks/use-media-query";
import { dateLocale } from "@/i18n";
import {
  useMarkAllRead,
  useMarkRead,
  useNotification,
  useNotificationSummary,
  useNotifications,
  type NotificationFilters,
} from "@/lib/api/notifications";
import type { Notification, NotificationType } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

const PAGE_SIZE = 20;
const ALL = "__all__";
const ID_PARAM = "id";

const isNotificationType = (v: string): v is NotificationType =>
  (NOTIFICATION_TYPES as readonly string[]).includes(v);

// ─── Tafsilot ────────────────────────────────────────────

function NotificationDetail({ n }: { n: Notification }) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const locale = dateLocale();
  const Icon = NOTIFICATION_ICONS[n.type] ?? Bell;
  const link = role ? relatedLinkFor(role, n) : null;
  const rows = NOTIFICATION_DATA_FIELDS.filter(({ key }) => {
    const v = n.data?.[key];
    return typeof v === "string" && v.trim().length > 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60",
            NOTIFICATION_ACCENTS[n.type],
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="break-words text-base font-semibold leading-snug">{n.title}</h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-normal">
              {t(notificationTypeKey(n.type))}
            </Badge>
            <span>{formatTashkentDateTime(n.created_at, locale)}</span>
          </div>
        </div>
      </div>

      {n.body && (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
          {n.body}
        </p>
      )}

      {rows.length > 0 && (
        <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-lg border border-border bg-muted/20 p-3 text-xs">
          {rows.map(({ key, labelKey, mono }) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{t(labelKey)}</dt>
              <dd className={cn("break-all", mono && "font-mono")}>{String(n.data[key])}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>
          {n.read_at
            ? t("notificationsPage.readAt", { date: formatTashkentDateTime(n.read_at, locale) })
            : t("notificationsPage.unread")}
        </span>
        {link && (
          <Button asChild size="sm" variant="outline">
            <Link to={link.to}>
              {t(link.labelKey)}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Ro'yxat elementi ────────────────────────────────────

function NotificationRow({
  n,
  active,
  onSelect,
}: {
  n: Notification;
  active: boolean;
  onSelect: (n: Notification) => void;
}) {
  const { t } = useTranslation();
  const Icon = NOTIFICATION_ICONS[n.type] ?? Bell;
  const isRead = !!n.read_at;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(n)}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4",
          !isRead && "bg-primary/5",
          active && "bg-muted/70",
        )}
      >
        <div className={cn("mt-0.5 shrink-0", NOTIFICATION_ACCENTS[n.type])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("truncate text-sm", isRead ? "font-normal" : "font-semibold")}>
              {n.title}
            </span>
            {!isRead && (
              <span
                className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary"
                aria-label={t("notificationsPage.unread")}
              />
            )}
          </div>
          {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            <span>{formatTashkentDateTime(n.created_at, dateLocale())}</span>
            <span aria-hidden="true">·</span>
            <span>{t(notificationTypeKey(n.type))}</span>
          </div>
        </div>
      </button>
    </li>
  );
}

// ─── Sahifa ──────────────────────────────────────────────

export function NotificationsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 300);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo<NotificationFilters>(
    () => ({
      unread: unreadOnly || undefined,
      types: isNotificationType(type) ? [type] : undefined,
      search: search || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [unreadOnly, type, search, dateFrom, dateTo],
  );
  // Filtr o'zgarsa 1-sahifaga
  const filterKey = JSON.stringify(filters);
  const [pageKey, setPageKey] = useState(filterKey);
  if (pageKey !== filterKey) {
    setPageKey(filterKey);
    setPage(1);
  }

  const { data, isPending, isFetching, error } = useNotifications(filters, page, PAGE_SIZE);
  const { data: summary } = useNotificationSummary();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "admin" || role === "super_admin";

  const items = data?.items ?? [];
  const selectedId = searchParams.get(ID_PARAM);
  const fromList = selectedId ? items.find((n) => n.id === selectedId) : undefined;
  // Qo'ng'iroqdan kelgan havola (?id=) joriy sahifada bo'lmasa — alohida so'raladi
  const { data: fetched, error: detailError } = useNotification(
    selectedId && !fromList ? selectedId : null,
  );
  const selected = fromList ?? (fetched?.id === selectedId ? fetched : undefined);

  const select = useCallback(
    (n: Notification | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (n) next.set(ID_PARAM, n.id);
          else next.delete(ID_PARAM);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Tanlangan xabar o'qildi deb belgilanadi (bir marta)
  useEffect(() => {
    if (selected && !selected.read_at && !markRead.isPending) markRead.mutate(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.read_at]);

  const dateInvalid = !!dateFrom && !!dateTo && dateTo < dateFrom;
  const hasFilters = !!searchInput || unreadOnly || type !== ALL || !!dateFrom || !!dateTo;
  const clearFilters = () => {
    setSearchInput("");
    setUnreadOnly(false);
    setType(ALL);
    setDateFrom("");
    setDateTo("");
  };

  const byType = summary?.by_type ?? {};
  const typeOptions = NOTIFICATION_TYPES.filter((tp) => (byType[tp] ?? 0) > 0 || tp === type);
  const unread = summary?.unread ?? 0;

  const handleMarkAll = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success(t("notificationsPage.allReadToast"));
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const detailCard = selected ? (
    <NotificationDetail n={selected} />
  ) : detailError ? (
    <Alert variant="destructive">
      <AlertDescription>{describeRequestError(detailError, t)}</AlertDescription>
    </Alert>
  ) : selectedId ? (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
      <MailOpen className="h-7 w-7 opacity-40" />
      {t("notificationsPage.selectHint")}
    </div>
  );

  return (
    <div className="container mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
            <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("notificationsPage.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {summary
              ? t("notificationsPage.summary", { unread, total: summary.total })
              : t("notificationsPage.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button asChild variant="outline">
              <Link to="/admin/notifications/sent">
                <Megaphone className="h-4 w-4" />
                {t("notificationsPage.broadcastLink")}
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => void handleMarkAll()}
            disabled={unread === 0 || markAllRead.isPending}
          >
            {markAllRead.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            {t("notificationsPage.markAllRead")}
          </Button>
        </div>
      </div>

      {/* Filtrlar */}
      <Card>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("notificationsPage.searchPlaceholder")}
              aria-label={t("common.search")}
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] lg:items-end">
            <div
              role="group"
              aria-label={t("notificationsPage.readFilter")}
              className="flex rounded-md border border-input p-0.5"
            >
              <Button
                type="button"
                size="sm"
                variant={unreadOnly ? "ghost" : "secondary"}
                className="h-8 flex-1"
                onClick={() => setUnreadOnly(false)}
              >
                {t("notificationsPage.all")}
                {summary && <span className="ml-1 text-xs opacity-70">{summary.total}</span>}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={unreadOnly ? "secondary" : "ghost"}
                className="h-8 flex-1"
                onClick={() => setUnreadOnly(true)}
              >
                {t("notificationsPage.unreadOnly")}
                {summary && <span className="ml-1 text-xs opacity-70">{unread}</span>}
              </Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notif-type" className="text-xs text-muted-foreground">
                {t("notificationsPage.typeLabel")}
              </Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="notif-type" className="h-9">
                  <SelectValue placeholder={t("notificationsPage.typeAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("notificationsPage.typeAll")}</SelectItem>
                  {typeOptions.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {t(notificationTypeKey(tp))}
                      {byType[tp] ? ` (${byType[tp]})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notif-from" className="text-xs text-muted-foreground">
                {t("notificationsPage.dateFrom")}
              </Label>
              <Input
                id="notif-from"
                type="date"
                className="h-9"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notif-to" className="text-xs text-muted-foreground">
                {t("notificationsPage.dateTo")}
              </Label>
              <Input
                id="notif-to"
                type="date"
                className="h-9"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={clearFilters}
              >
                <X className="h-4 w-4" />
                {t("common.clear")}
              </Button>
            )}
          </div>
          {dateInvalid && (
            <p className="text-xs text-destructive">{t("notificationsPage.dateInvalid")}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
        {/* Ro'yxat */}
        <Card className="overflow-hidden">
          {error ? (
            <Alert variant="destructive" className="m-3">
              <AlertDescription>{describeRequestError(error, t)}</AlertDescription>
            </Alert>
          ) : isPending ? (
            <ul className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex gap-3 px-4 py-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <CardContent className="py-10">
              <EmptyState
                icon={Inbox}
                title={t("notificationsPage.empty")}
                description={
                  hasFilters
                    ? t("notificationsPage.emptyFiltered")
                    : t("notificationsPage.emptyHint")
                }
              />
            </CardContent>
          ) : (
            <ul
              className={cn("divide-y divide-border", isFetching && "opacity-70")}
              aria-busy={isFetching}
            >
              {items.map((n) => (
                <NotificationRow key={n.id} n={n} active={n.id === selectedId} onSelect={select} />
              ))}
            </ul>
          )}
          {data && data.total > PAGE_SIZE && (
            <div className="border-t border-border px-3 py-2">
              <ListPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={data.total}
                onPageChange={setPage}
                disabled={isFetching}
              />
            </div>
          )}
        </Card>

        {/* Tafsilot: katta ekranda yon panel, telefonda dialog */}
        {isDesktop ? (
          <Card className="sticky top-4">
            <CardContent className="p-4">{detailCard}</CardContent>
          </Card>
        ) : (
          <Dialog open={!!selectedId} onOpenChange={(o) => !o && select(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("notificationsPage.detailTitle")}</DialogTitle>
                <DialogDescription className="sr-only">
                  {t("notificationsPage.detailTitle")}
                </DialogDescription>
              </DialogHeader>
              {detailCard}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
