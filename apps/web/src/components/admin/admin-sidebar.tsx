import {
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  School,
  UserCog,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { NotificationsBell } from "@/components/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { logout } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

const navItems: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { to: "/admin", label: "Bosh sahifa", icon: LayoutDashboard, end: true },
  { to: "/admin/academic", label: "Akademik", icon: School },
  { to: "/admin/practice-types", label: "Amaliyot turlari", icon: BookOpen },
  { to: "/admin/objects", label: "Obyektlar", icon: Building2 },
  { to: "/admin/supervisors", label: "Rahbarlar", icon: UserCog },
  { to: "/admin/students", label: "Talabalar", icon: Users },
  { to: "/admin/assignments", label: "Biriktirish", icon: ClipboardList },
  { to: "/admin/contracts", label: "Shartnomalar", icon: FileCheck2 },
  { to: "/admin/attendance", label: "Davomat", icon: CalendarCheck },
  { to: "/admin/task-templates", label: "Topshiriqlar", icon: LibraryBig },
];

export function AdminSidebar() {
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <GraduationCap className="h-5 w-5 text-primary" />
        <span className="font-semibold tracking-tight">CHDPU Amaliyot</span>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer — theme + user */}
      <div className="border-t border-border p-3">
        <div className="mb-3 flex justify-center gap-2">
          <NotificationsBell />
          <ThemeToggle />
        </div>
        <Separator className="my-2" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {user?.first_name[0] ?? "?"}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="truncate text-sm font-medium">{user?.full_name ?? "—"}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.role}</div>
          </div>
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
      </div>
    </aside>
  );
}
