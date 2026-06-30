import {
  BookOpen,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  School,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import { NotificationsBell } from "@/components/notifications-bell";
import { ProfileDialog } from "@/components/profile-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { logout } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  superAdminOnly?: boolean;
};

type NavSection = {
  label?: string; // section heading; undefined = no heading
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [
      { to: "/admin", label: "Bosh sahifa", icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: "Akademik",
    items: [
      { to: "/admin/academic", label: "Fakultet/guruh", icon: School },
      { to: "/admin/students", label: "Talabalar", icon: Users },
      { to: "/admin/supervisors", label: "Rahbarlar", icon: UserCog },
    ],
  },
  {
    label: "Amaliyotlar",
    items: [
      { to: "/admin/practice-types", label: "Amaliyot turlari", icon: BookOpen },
      { to: "/admin/objects", label: "Obyektlar", icon: Building2 },
      { to: "/admin/assignments", label: "Biriktirishlar", icon: ClipboardList },
      { to: "/admin/contracts", label: "Shartnomalar", icon: FileCheck2 },
      { to: "/admin/attendance", label: "Davomat", icon: CalendarCheck },
    ],
  },
  {
    label: "O'quv jarayoni",
    items: [
      { to: "/admin/task-templates", label: "Topshiriqlar", icon: LibraryBig },
      { to: "/admin/documents", label: "Hujjatlar", icon: FileText },
      { to: "/admin/reports", label: "Yakuniy hisobotlar", icon: FileCheck2 },
      { to: "/admin/records", label: "Qaydnomalar", icon: ClipboardCheck },
    ],
  },
  {
    label: "Tizim",
    items: [
      { to: "/admin/admins", label: "Adminlar", icon: ShieldCheck, superAdminOnly: true },
      { to: "/admin/audit-log", label: "Audit log", icon: Shield, superAdminOnly: true },
      { to: "/admin/system-settings", label: "Sozlamalar", icon: Settings, superAdminOnly: true },
    ],
  },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

export function AdminSidebar() {
  const user = useAuthStore((s) => s.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card transition-[width] duration-200",
          collapsed ? "w-16" : "w-64",
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
              <span className="flex-1 text-left">Qidiruv...</span>
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
                {section.label && !collapsed && (
                  <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </div>
                )}
                {visibleItems.map(({ to, label, icon: Icon, end }) => {
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
                      {!collapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                  );

                  if (!collapsed) return link;
                  return (
                    <Tooltip key={to}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{label}</TooltipContent>
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
                    title="Profilim"
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
                  {user?.full_name ?? "Profilim"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    aria-label="Chiqish"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Chiqish</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setProfileOpen(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
                title="Profilim"
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
                aria-label="Chiqish"
                title="Chiqish"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            )}
            aria-label={collapsed ? "Yoyish" : "Yig'ish"}
            title={collapsed ? "Yoyish" : "Yig'ish"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                Yig'ish
              </>
            )}
          </button>
        </div>
        <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      </aside>
    </TooltipProvider>
  );
}
