import {
  Bell,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dateLocale } from "@/i18n";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "@/lib/api/notifications";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/api/types";

const ICONS: Record<NotificationType, LucideIcon> = {
  task_approved: CheckCircle2,
  task_rejected: XCircle,
  journal_approved: CheckCircle2,
  journal_rejected: XCircle,
  analysis_approved: CheckCircle2,
  analysis_rejected: XCircle,
  attendance_rejected: CalendarCheck,
  attendance_override: ShieldCheck,
  contract_generated: FileCheck2,
  contract_activated: FileCheck2,
  generic: BookOpen,
};

const ACCENTS: Record<NotificationType, string> = {
  task_approved: "text-success",
  task_rejected: "text-destructive",
  journal_approved: "text-success",
  journal_rejected: "text-destructive",
  analysis_approved: "text-success",
  analysis_rejected: "text-destructive",
  attendance_rejected: "text-destructive",
  attendance_override: "text-primary",
  contract_generated: "text-info",
  contract_activated: "text-success",
  generic: "text-muted-foreground",
};

function NotificationItem({
  n,
  onClick,
}: {
  n: Notification;
  onClick: (id: string) => void;
}) {
  const Icon = ICONS[n.type] ?? BookOpen;
  const isRead = !!n.read_at;

  return (
    <button
      onClick={() => onClick(n.id)}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/30",
        !isRead && "bg-primary/5",
      )}
    >
      <div className={cn("mt-0.5 shrink-0", ACCENTS[n.type])}>
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
          {new Date(n.created_at).toLocaleString(dateLocale())}
        </div>
      </div>
    </button>
  );
}

export function NotificationsBell() {
  const { t } = useTranslation();
  const { data: count } = useUnreadCount();
  const { data: list } = useNotifications(false, 1, 15);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unread = count?.unread ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("notificationsBell.title")}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 max-w-[95vw] p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span>
            {t("notificationsBell.title")}{" "}
            {unread > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("notificationsBell.newCount", { n: unread })}
              </span>
            )}
          </span>
          {unread > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="h-7 text-xs"
            >
              {t("notificationsBell.markAllRead")}
            </Button>
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
              <NotificationItem
                key={n.id}
                n={n}
                onClick={(id) => {
                  if (!n.read_at) markRead.mutate(id);
                }}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
