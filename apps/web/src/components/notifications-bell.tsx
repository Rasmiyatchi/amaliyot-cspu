import { ArrowRight, Bell, BookOpen, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  NOTIFICATION_ACCENTS,
  NOTIFICATION_ICONS,
} from "@/components/notifications/notification-meta";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { dateLocale } from "@/i18n";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "@/lib/api/notifications";
import { notificationsPathFor } from "@/lib/routing";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

/** Menyu elementi — strelka tugmalari bilan ham tanlanadi; tanlash menyuni yopmaydi. */
function NotificationItem({
  n,
  onSelect,
}: {
  n: Notification;
  onSelect: (n: Notification) => void;
}) {
  const Icon = NOTIFICATION_ICONS[n.type] ?? BookOpen;
  const isRead = !!n.read_at;

  return (
    <DropdownMenuItem
      onSelect={() => onSelect(n)}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 rounded-none border-b border-border px-3 py-2.5 text-left last:border-0 focus:bg-muted/40",
        !isRead && "bg-primary/5",
      )}
    >
      <div className={cn("mt-0.5 shrink-0", NOTIFICATION_ACCENTS[n.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "truncate text-sm",
              isRead ? "font-normal" : "font-semibold",
            )}
          >
            {n.title}
          </div>
          {!isRead && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
        {n.body && (
          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {n.body}
          </div>
        )}
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatTashkentDateTime(n.created_at, dateLocale())}
        </div>
      </div>
    </DropdownMenuItem>
  );
}

export function NotificationsBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const { data: count } = useUnreadCount();
  const { data: list } = useNotifications({}, 1, 15);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unread = count?.unread ?? 0;
  const pagePath = role ? notificationsPathFor(role) : null;

  // Element bosilganda — o'qildi + sahifada to'liq tafsilot (dropdown'da matn qisqartirilgan)
  const openItem = (item: Notification) => {
    if (!item.read_at) markRead.mutate(item.id);
    if (pagePath) navigate(`${pagePath}?id=${item.id}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-200/70 transition-all dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label={t("notificationsBell.title")}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 max-w-[95vw] p-0">
        <DropdownMenuLabel className="flex items-center justify-between gap-2 px-3 py-2">
          <span>
            {t("notificationsBell.title")}{" "}
            {unread > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("notificationsBell.newCount", { n: unread })}
              </span>
            )}
          </span>
          {unread > 0 && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                markAllRead.mutate();
              }}
              disabled={markAllRead.isPending}
              className="h-7 shrink-0 cursor-pointer px-2 text-xs font-medium"
            >
              {t("notificationsBell.markAllRead")}
            </DropdownMenuItem>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />

        {!list || list.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <Sparkles className="h-6 w-6 opacity-40" />
            {t("notificationsBell.empty")}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {list.items.map((n) => (
              <NotificationItem key={n.id} n={n} onSelect={openItem} />
            ))}
          </div>
        )}
        {pagePath && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <DropdownMenuItem
              onSelect={() => navigate(pagePath)}
              className="cursor-pointer justify-center gap-1.5 py-2.5 text-sm font-medium text-primary focus:text-primary"
            >
              {t("notificationsBell.viewAll")}
              <ArrowRight className="h-4 w-4" />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
