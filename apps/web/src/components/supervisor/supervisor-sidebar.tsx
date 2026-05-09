import {
  BookOpen,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import { NotificationsBell } from "@/components/notifications-bell";
import { ProfileDialog } from "@/components/profile-dialog";
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
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
};

type NavSection = {
  label?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [{ to: "/supervisor", label: "Bosh sahifa", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Amaliyotlar",
    items: [
      { to: "/supervisor/regulations", label: "Normativ hujjatlar", icon: ScrollText },
      { to: "/supervisor/programs", label: "Amaliyot dasturlari", icon: BookOpen },
      { to: "/supervisor/students", label: "Talabalarim", icon: Users },
      { to: "/supervisor/attendance", label: "Davomat", icon: CalendarCheck },
      { to: "/supervisor/tasks", label: "Topshiriqlar", icon: ClipboardList },
    ],
  },
];

const STORAGE_KEY = "supervisor-sidebar-collapsed";

export function SupervisorSidebar() {
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
        <div
          className={cn(
            "flex h-14 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "gap-2 px-4",
          )}
        >
          <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
          {!collapsed && (
            <span className="truncate font-semibold tracking-tight">
              Amaliyot rahbari
            </span>
          )}
        </div>

        <nav className={cn("flex-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
          {navSections.map((section, secIdx) => (
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
              {section.items.map(({ to, label, icon: Icon, end }) => {
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
          ))}
        </nav>

        <div className={cn("border-t border-border", collapsed ? "p-2" : "p-3")}>
          <div
            className={cn(
              "mb-3 flex justify-center gap-2",
              collapsed && "flex-col items-center",
            )}
          >
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
                      <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      user?.first_name[0] ?? "?"
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{user?.full_name ?? "Profilim"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Chiqish">
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
                <div className="truncate text-xs text-muted-foreground">Supervisor</div>
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

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={collapsed ? "Yoyish" : "Yig'ish"}
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
