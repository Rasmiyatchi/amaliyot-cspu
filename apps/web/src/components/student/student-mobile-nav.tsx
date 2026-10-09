import { Bell, Home, UserCircle, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { useUnreadCount } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

type Item = { to: string; labelKey: string; icon: LucideIcon; end?: boolean; badge?: boolean };

const ITEMS: Item[] = [
  { to: "/student", labelKey: "studentMobileNav.home", icon: Home, end: true },
  {
    to: "/student/notifications",
    labelKey: "studentMobileNav.notifications",
    icon: Bell,
    badge: true,
  },
  { to: "/student/profile", labelKey: "studentMobileNav.profile", icon: UserCircle },
];

/** Telefonda talaba uchun pastki navigatsiya (md va kattaroqda yashirin). */
export function StudentMobileNav() {
  const { t } = useTranslation();
  const { data: count } = useUnreadCount();
  const unread = count?.unread ?? 0;

  return (
    <nav
      aria-label={t("studentMobileNav.label")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xs md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {ITEMS.map(({ to, labelKey, icon: Icon, end, badge }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {badge && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </span>
              {t(labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
