import {
  BookOpen,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardEdit,
  ClipboardList,
  FileCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  MessageSquare,
  School,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  UserCog,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { logout } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

type NavItem = {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  superAdminOnly?: boolean;
};

type NavSection = {
  labelKey?: string; // section heading; undefined = no heading
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [
      { to: "/admin", labelKey: "adminAdminSidebar.nav.dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    labelKey: "adminAdminSidebar.sections.academic",
    items: [
      { to: "/admin/academic", labelKey: "adminAdminSidebar.nav.academic", icon: School },
      { to: "/admin/students", labelKey: "common.students", icon: Users },
      { to: "/admin/supervisors", labelKey: "adminAdminSidebar.nav.supervisors", icon: UserCog },
    ],
  },
  {
    labelKey: "adminAdminSidebar.sections.practices",
    items: [
      { to: "/admin/practice-types", labelKey: "adminAdminSidebar.nav.practiceTypes", icon: BookOpen },
      { to: "/admin/objects", labelKey: "adminAdminSidebar.nav.objects", icon: Building2 },
      { to: "/admin/assignments", labelKey: "adminAdminSidebar.nav.assignments", icon: ClipboardList },
      { to: "/admin/applications", labelKey: "adminAdminSidebar.nav.applications", icon: ClipboardEdit },
      { to: "/admin/contracts", labelKey: "adminAdminSidebar.nav.contracts", icon: FileCheck2 },
      {
        to: "/admin/contract-templates",
        labelKey: "adminAdminSidebar.nav.contractTemplates",
        icon: FileText,
        superAdminOnly: true,
      },
      { to: "/admin/attendance", labelKey: "adminAdminSidebar.nav.attendance", icon: CalendarCheck },
    ],
  },
  {
    labelKey: "adminAdminSidebar.sections.studyProcess",
    items: [
      { to: "/admin/task-templates", labelKey: "adminAdminSidebar.nav.taskTemplates", icon: LibraryBig },
      { to: "/admin/documents", labelKey: "adminAdminSidebar.nav.documents", icon: FileText },
      { to: "/admin/reports", labelKey: "adminAdminSidebar.nav.reports", icon: FileCheck2 },
      { to: "/admin/records", labelKey: "adminAdminSidebar.nav.records", icon: ClipboardCheck },
      { to: "/admin/inquiries", labelKey: "adminAdminSidebar.nav.inquiries", icon: MessageSquare },
    ],
  },
  {
    labelKey: "adminAdminSidebar.sections.system",
    items: [
      { to: "/admin/admins", labelKey: "adminAdminSidebar.nav.admins", icon: ShieldCheck, superAdminOnly: true },
      { to: "/admin/audit-log", labelKey: "adminAdminSidebar.nav.auditLog", icon: Shield, superAdminOnly: true },
      { to: "/admin/system-settings", labelKey: "adminAdminSidebar.nav.settings", icon: Settings, superAdminOnly: true },
    ],
  },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

/**
 * @param inSheet - mobil drawer ichida render qilinyaptimi. Bunda sidebar
 *   har doim ko'rinadi (yig'ilmaydi), desktopda esa `hidden md:flex`.
 */
export function AdminSidebar({ inSheet = false }: { inSheet?: boolean } = {}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsedPref, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  // Mobil drawer ichida sidebar hech qachon yig'ilmaydi (yorliqlar ko'rinsin)
  const collapsed = inSheet ? false : collapsedPref;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsedPref ? "1" : "0");
  }, [collapsedPref]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          "h-screen flex-col border-r border-border bg-card transition-[width] duration-200",
          // Mobilda sidebar 256px joyni yeb qo'yardi (375px ekranda kontentga ~55px
          // qolardi) — endi faqat md+ da ko'rinadi, mobilda drawer ichida chiqadi.
          inSheet ? "flex w-64 border-r-0" : "hidden md:flex",
          !inSheet && (collapsed ? "w-16" : "w-64"),
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "gap-2 px-4",
          )}
        >
          <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
          {!collapsed && (
            <span className="truncate font-semibold tracking-tight">
              CHDPU Amaliyot
            </span>
          )}
        </div>

        {/* Cmd+K hint */}
        {!collapsed && (
          <div className="border-b border-border px-3 py-2">
            <button
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
                );
              }}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">{t("adminAdminSidebar.searchHint")}</span>
              <kbd className="hidden rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] sm:inline">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Menu */}
        <nav className={cn("flex-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
          {navSections.map((section, secIdx) => {
            const visibleItems = section.items.filter(
              (item) => !item.superAdminOnly || user?.role === "super_admin",
            );
            if (visibleItems.length === 0) return null;
            return (
              <div
                key={secIdx}
                className={cn(
                  "space-y-0.5",
                  secIdx > 0 && (collapsed ? "mt-2 border-t border-border pt-2" : "mt-3"),
                )}
              >
                {section.labelKey && !collapsed && (
                  <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(section.labelKey)}
                  </div>
                )}
                {visibleItems.map(({ to, labelKey, icon: Icon, end }) => {
                  const link = (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center rounded-md text-sm font-medium transition-colors",
                          collapsed ? "h-10 w-10 justify-center" : "gap-3 px-3 py-2",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{t(labelKey)}</span>}
                    </NavLink>
                  );

                  if (!collapsed) return link;
                  return (
                    <Tooltip key={to}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{t(labelKey)}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer — theme + user */}
        <div className={cn("border-t border-border", collapsed ? "p-2" : "p-3")}>
          <div className={cn("mb-3 flex justify-center gap-2", collapsed && "flex-col items-center")}>
            <NotificationsBell />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <Separator className="my-2" />
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setProfileOpen(true)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
                    title={t("adminAdminSidebar.myProfile")}
                  >
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user?.first_name[0] ?? "?"
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {user?.full_name ?? t("adminAdminSidebar.myProfile")}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    aria-label={t("adminAdminSidebar.logout")}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t("adminAdminSidebar.logout")}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setProfileOpen(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
                title={t("adminAdminSidebar.myProfile")}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  user?.first_name[0] ?? "?"
                )}
              </button>
              <button
                onClick={() => setProfileOpen(true)}
                className="flex-1 overflow-hidden text-left transition-opacity hover:opacity-80"
              >
                <div className="truncate text-sm font-medium">
                  {user?.full_name ?? "—"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {user?.role}
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label={t("adminAdminSidebar.logout")}
                title={t("adminAdminSidebar.logout")}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Collapse toggle — drawer ichida ma'nosiz, shuning uchun yashiriladi */}
          {!inSheet && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className={cn(
                "mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              )}
              aria-label={collapsed ? t("adminAdminSidebar.expand") : t("adminAdminSidebar.collapse")}
              title={collapsed ? t("adminAdminSidebar.expand") : t("adminAdminSidebar.collapse")}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  {t("adminAdminSidebar.collapse")}
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
