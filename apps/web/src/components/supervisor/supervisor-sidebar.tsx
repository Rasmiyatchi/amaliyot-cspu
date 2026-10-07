import {
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { NotificationsBell } from "@/components/notifications-bell";
import { ProfileDialog } from "@/components/profile-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { logout } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

type NavItem = {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
};

type NavSection = {
  labelKey?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [
      { to: "/supervisor", labelKey: "supervisorSupervisorSidebar.nav.dashboard", icon: LayoutDashboard, end: true },
      { to: "/supervisor/notifications", labelKey: "supervisorSupervisorSidebar.nav.notifications", icon: Bell, end: true },
    ],
  },
  {
    labelKey: "supervisorSupervisorSidebar.sections.practices",
    items: [
      { to: "/supervisor/regulations", labelKey: "supervisorSupervisorSidebar.nav.regulations", icon: ScrollText },
      { to: "/supervisor/programs", labelKey: "supervisorSupervisorSidebar.nav.programs", icon: BookOpen },
      { to: "/supervisor/students", labelKey: "supervisorSupervisorSidebar.nav.myStudents", icon: Users },
      { to: "/supervisor/attendance", labelKey: "supervisorSupervisorSidebar.nav.attendance", icon: CalendarCheck },
      { to: "/supervisor/tasks", labelKey: "supervisorSupervisorSidebar.nav.tasks", icon: ClipboardList },
      { to: "/supervisor/reports", labelKey: "supervisorSupervisorSidebar.nav.reports", icon: FileCheck2 },
    ],
  },
];

const STORAGE_KEY = "supervisor-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param inSheet - mobil drawer ichida render qilinyaptimi (admin sidebar bilan bir xil).
 */
export function SupervisorSidebar({ inSheet = false }: { inSheet?: boolean } = {}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsedPref, setCollapsed] = useState<boolean>(readCollapsed);

  // Drawer ichida yig'ilmaydi (yorliqlar ko'rinsin)
  const collapsed = inSheet ? false : collapsedPref;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsedPref ? "1" : "0");
    } catch {
      /* xususiy rejim — tanlov faqat shu sessiyada saqlanadi */
    }
  }, [collapsedPref]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          "h-screen flex-col border-r border-slate-200 bg-white text-slate-800 transition-[width] duration-200 select-none dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-200",
          inSheet ? "flex w-64 border-r-0" : "hidden md:flex",
          !inSheet && (collapsed ? "w-16" : "w-64"),
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-slate-200/90 dark:border-slate-800/80",
            collapsed ? "justify-center px-2" : "gap-3 px-4",
          )}
        >
          <img src="/favicon.png" alt="CHDPU" className="h-8 w-8 shrink-0 object-contain rounded" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="truncate font-extrabold text-sm uppercase text-slate-900 tracking-tight dark:text-white">
                {t("supervisorSupervisorLayout.brand")}
              </span>
              <span className="truncate text-[9px] font-bold uppercase text-indigo-600 tracking-wider dark:text-indigo-400">
                {t("supervisorSupervisorSidebar.title")}
              </span>
            </div>
          )}
        </div>

        <nav className={cn("flex-1 overflow-y-auto custom-scrollbar", collapsed ? "p-2" : "p-3")}>
          {navSections.map((section, secIdx) => (
            <div
              key={secIdx}
              className={cn(
                "space-y-0.5",
                secIdx > 0 && (collapsed ? "mt-2 border-t border-slate-200 pt-2 dark:border-slate-800" : "mt-3"),
              )}
            >
              {section.labelKey && !collapsed && (
                <div className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t(section.labelKey)}
                </div>
              )}
              {section.items.map(({ to, labelKey, icon: Icon, end }) => {
                const link = (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-lg text-sm font-medium transition-colors group",
                        collapsed ? "h-10 w-10 justify-center" : "gap-3 px-3 py-2",
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-semibold border-l-2 border-indigo-600 shadow-xs dark:bg-indigo-600/20 dark:text-white dark:border-indigo-400 dark:shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200",
                          )}
                        />
                        {!collapsed && <span className="truncate">{t(labelKey)}</span>}
                      </>
                    )}
                  </NavLink>
                );

                if (!collapsed) return link;
                return (
                  <Tooltip key={to}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 border-slate-700 text-white">
                      {t(labelKey)}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={cn("border-t border-slate-200 dark:border-slate-800", collapsed ? "p-2" : "p-3")}>
          <div
            className={cn(
              "mb-3 flex justify-center gap-2",
              collapsed && "flex-col items-center",
            )}
          >
            <NotificationsBell />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <Separator className="my-2 bg-slate-200 dark:bg-slate-800" />
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300 transition-opacity hover:opacity-80"
                    aria-label={t("supervisorSupervisorSidebar.myProfile")}
                  >
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (user?.first_name?.[0] ?? "?").toUpperCase()
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {user?.full_name ?? t("supervisorSupervisorSidebar.myProfile")}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label={t("supervisorSupervisorSidebar.logout")}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t("supervisorSupervisorSidebar.logout")}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300 transition-opacity hover:opacity-80"
                title={t("supervisorSupervisorSidebar.myProfile")}
                aria-label={t("supervisorSupervisorSidebar.myProfile")}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (user?.first_name?.[0] ?? "?").toUpperCase()
                )}
              </button>
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex-1 overflow-hidden text-left transition-opacity hover:opacity-80"
              >
                <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                  {user?.full_name ?? "—"}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {t("common.supervisor")}
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label={t("supervisorSupervisorSidebar.logout")}
                title={t("supervisorSupervisorSidebar.logout")}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}

          {!inSheet && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label={
                collapsed
                  ? t("supervisorSupervisorSidebar.expand")
                  : t("supervisorSupervisorSidebar.collapse")
              }
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  {t("supervisorSupervisorSidebar.collapse")}
                </>
              )}
            </button>
          )}
        </div>
        <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      </aside>
    </TooltipProvider>
  );
}
