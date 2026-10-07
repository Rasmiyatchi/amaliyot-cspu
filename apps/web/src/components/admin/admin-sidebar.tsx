import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Building,
  Building2,
  Calendar,
  CalendarCheck,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardEdit,
  ClipboardList,
  Compass,
  Database,
  FileCheck2,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  MapPin,
  MessageSquare,
  School,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationsBell } from "@/components/notifications-bell";
import { ProfileDialog } from "@/components/profile-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { academicKeys } from "@/lib/api/academic";
import { studentKeys } from "@/lib/api/students";
import type { Paginated } from "@/lib/api/types";
import { logout } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import { useAuthStore, type User } from "@/stores/auth";

type NavChild = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
  superAdminOnly?: boolean;
  /** Admin uchun: ro'yxatdagi ruxsatlardan BIRI yetarli (router `Protected` bilan bir xil) */
  permissions?: string[];
};

type NavItemConfig = {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  to?: string;
  end?: boolean;
  superAdminOnly?: boolean;
  permissions?: string[];
  children?: NavChild[];
};

const PRACTICE = ["practice"];
const CONTRACTS = ["contracts", "practice"];

const ADMIN_NAV_CONFIG: NavItemConfig[] = [
  // 1. Bosh sahifa
  {
    id: "dashboard",
    to: "/admin",
    labelKey: "adminAdminSidebar.nav.dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  {
    id: "notifications",
    to: "/admin/notifications",
    labelKey: "adminAdminSidebar.nav.notifications",
    icon: Bell,
    end: true,
  },

  // 2. Tuzilma (akademik tuzilma)
  {
    id: "structure",
    labelKey: "adminAdminSidebar.nav.structure",
    icon: School,
    permissions: ["structure"],
    children: [
      { to: "/admin/structure/faculties", labelKey: "adminAdminSidebar.nav.faculties", icon: Building, end: true },
      { to: "/admin/structure/departments", labelKey: "adminAdminSidebar.nav.departments", icon: Layers, end: true },
      { to: "/admin/structure/directions", labelKey: "adminAdminSidebar.nav.directions", icon: Compass, end: true },
      { to: "/admin/structure/groups", labelKey: "adminAdminSidebar.nav.groups", icon: Users, end: true },
      { to: "/admin/structure/academic-years", labelKey: "adminAdminSidebar.nav.academicYears", icon: Calendar, end: true },
      { to: "/admin/structure/students", labelKey: "adminAdminSidebar.nav.students", icon: UserCheck, end: true },
    ],
  },

  // 3. Amaliyot. Obyektlar bu yerda emas — /admin/objects "partners" ruxsatini talab qiladi
  {
    id: "practice",
    labelKey: "adminAdminSidebar.nav.practice",
    icon: GraduationCap,
    permissions: CONTRACTS,
    children: [
      { to: "/admin/practice-types", labelKey: "adminAdminSidebar.nav.practiceTypes", icon: BookOpen, permissions: PRACTICE },
      { to: "/admin/assignments", labelKey: "adminAdminSidebar.nav.assignments", icon: ClipboardList, permissions: PRACTICE },
      { to: "/admin/applications", labelKey: "adminAdminSidebar.nav.applications", icon: ClipboardEdit, permissions: CONTRACTS },
      { to: "/admin/contracts", labelKey: "adminAdminSidebar.nav.contracts", icon: FileCheck2, permissions: CONTRACTS },
      { to: "/admin/attendance", labelKey: "adminAdminSidebar.nav.attendance", icon: CalendarCheck, permissions: PRACTICE },
      { to: "/admin/task-templates", labelKey: "adminAdminSidebar.nav.taskTemplates", icon: LibraryBig, permissions: PRACTICE },
      { to: "/admin/documents", labelKey: "adminAdminSidebar.nav.documents", icon: FileText, permissions: PRACTICE },
      { to: "/admin/reports", labelKey: "adminAdminSidebar.nav.reports", icon: Award, permissions: PRACTICE },
      { to: "/admin/records", labelKey: "adminAdminSidebar.nav.records", icon: ClipboardCheck, permissions: PRACTICE },
    ],
  },

  // 4. Rahbarlar
  {
    id: "supervisors",
    to: "/admin/supervisors",
    labelKey: "adminAdminSidebar.nav.supervisors",
    icon: UserCog,
    permissions: ["supervisors"],
  },

  // 5. Hamkorlar — /admin/objects ikki tabli sahifa (tashkilotlar / hududlar)
  {
    id: "partners",
    labelKey: "adminAdminSidebar.nav.partners",
    icon: Building,
    permissions: ["partners"],
    children: [
      { to: "/admin/objects?tab=organizations", labelKey: "adminAdminSidebar.nav.organizations", icon: Building2 },
      { to: "/admin/objects?tab=areas", labelKey: "adminAdminSidebar.nav.areas", icon: MapPin },
    ],
  },

  // 6. Monitoring
  {
    id: "monitoring",
    labelKey: "adminAdminSidebar.nav.monitoring",
    icon: BarChart3,
    permissions: ["monitoring"],
    children: [
      { to: "/admin/monitoring", labelKey: "adminAdminSidebar.nav.monitoringOverview", icon: Activity, end: true },
      { to: "/admin/monitoring/practices", labelKey: "adminAdminSidebar.nav.monitoringPractices", icon: BookOpen },
      { to: "/admin/monitoring/attendance", labelKey: "adminAdminSidebar.nav.monitoringAttendance", icon: CalendarCheck },
      { to: "/admin/monitoring/tasks", labelKey: "adminAdminSidebar.nav.monitoringTasks", icon: CheckSquare },
      { to: "/admin/monitoring/supervisors", labelKey: "adminAdminSidebar.nav.monitoringSupervisors", icon: UserCog },
      { to: "/admin/monitoring/objects", labelKey: "adminAdminSidebar.nav.monitoringObjects", icon: Building2 },
      { to: "/admin/monitoring/issues", labelKey: "adminAdminSidebar.nav.monitoringIssues", icon: AlertTriangle },
      { to: "/admin/monitoring/map", labelKey: "adminAdminSidebar.nav.monitoringMap", icon: MapPin },
      { to: "/admin/monitoring/analytics", labelKey: "adminAdminSidebar.nav.monitoringAnalytics", icon: TrendingUp },
    ],
  },

  // 7. Murojaatlar
  {
    id: "inquiries",
    to: "/admin/inquiries",
    labelKey: "adminAdminSidebar.nav.inquiries",
    icon: MessageSquare,
    permissions: ["inquiries"],
  },

  // 8. Tizim
  {
    id: "system",
    labelKey: "adminAdminSidebar.nav.system",
    icon: Settings,
    children: [
      { to: "/admin/admins", labelKey: "adminAdminSidebar.nav.admins", icon: ShieldCheck, superAdminOnly: true },
      { to: "/admin/audit-log", labelKey: "adminAdminSidebar.nav.auditLog", icon: Shield, superAdminOnly: true },
      { to: "/admin/integrations", labelKey: "adminAdminSidebar.nav.integrations", icon: Database, permissions: ["system"] },
      { to: "/admin/contract-templates", labelKey: "adminAdminSidebar.nav.contractTemplates", icon: FileText, superAdminOnly: true },
      { to: "/admin/system-settings", labelKey: "adminAdminSidebar.nav.settings", icon: Sliders, superAdminOnly: true },
    ],
  },
];

/**
 * Menyu bandi ko'rinadimi — router `Protected` va backend `require_permission` bilan bir xil:
 * super_admin hammasini ko'radi; admin — ruxsatlaridan biri mos kelsa
 * ("contracts" sahifalari "practice" ruxsati bilan ham ochiladi).
 */
function isAllowed(
  user: User | null,
  rule: { superAdminOnly?: boolean; permissions?: string[] },
): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (rule.superAdminOnly) return false;
  if (!rule.permissions || rule.permissions.length === 0) return true;
  const perms = user.permissions ?? [];
  return rule.permissions.some(
    (p) => perms.includes(p) || (p === "contracts" && perms.includes("practice")),
  );
}

const STRUCTURE_COUNT_URLS: { to: string; url: string; key: readonly unknown[] }[] = [
  {
    to: "/admin/structure/faculties",
    url: "v1/academic/faculties?page=1&page_size=1",
    key: [...academicKeys.faculties(), 1, 1],
  },
  {
    to: "/admin/structure/departments",
    url: "v1/academic/departments?page=1&page_size=1",
    key: [...academicKeys.departments(undefined), 1, 1],
  },
  {
    to: "/admin/structure/directions",
    url: "v1/academic/directions?page=1&page_size=1",
    key: [...academicKeys.directions(undefined), 1, 1],
  },
  {
    to: "/admin/structure/groups",
    url: "v1/academic/groups?page=1&page_size=1",
    key: [...academicKeys.groups({}), 1, 1],
  },
  {
    to: "/admin/structure/students",
    url: "v1/students?page=1&page_size=1",
    key: studentKeys.list({}, 1, 1),
  },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

function isChildActive(child: NavChild, pathname: string, search: string): boolean {
  // Query string bilan URLs (objects tab)
  if (child.to.includes("?")) {
    const [path, query] = child.to.split("?");
    if (pathname !== path) return false;
    if (query) {
      if (search.includes(query)) return true;
      if (!search && (query === "tab=organizations" || query === "tab=faculties")) return true;
      return false;
    }
    return true;
  }
  // end: true = exact match
  if (child.end) {
    return pathname === child.to;
  }
  // /admin/monitoring special case
  if (child.to === "/admin/monitoring") {
    return pathname === child.to || pathname === `${child.to}/overview`;
  }
  return pathname === child.to || pathname.startsWith(`${child.to}/`);
}

function isParentActive(item: NavItemConfig, pathname: string, search: string): boolean {
  if (item.to) {
    if (item.end) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  }
  if (item.children) {
    return item.children.some((child) => isChildActive(child, pathname, search));
  }
  return false;
}

export function AdminSidebar({ inSheet = false }: { inSheet?: boolean } = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [profileOpen, setProfileOpen] = useState(false);

  const [collapsedPref, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  const collapsed = inSheet ? false : collapsedPref;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsedPref ? "1" : "0");
  }, [collapsedPref]);

  // Find active parent ID from current route
  const activeParentId = useMemo(() => {
    for (const item of ADMIN_NAV_CONFIG) {
      if (item.children && isParentActive(item, location.pathname, location.search)) {
        return item.id;
      }
    }
    return null;
  }, [location.pathname, location.search]);

  // Akkordeon: bir vaqtda bitta bo'lim ochiq. Sahifa almashganda shu sahifa bo'limi ochiladi
  // (render vaqtida holatni moslash — effect + qo'shimcha render shart emas).
  const [openParentId, setOpenParentId] = useState<string | null>(() => activeParentId);
  const [syncedParentId, setSyncedParentId] = useState<string | null>(activeParentId);
  if (activeParentId !== syncedParentId) {
    setSyncedParentId(activeParentId);
    if (activeParentId) setOpenParentId(activeParentId);
  }

  // Tuzilma bo'limidagi sonlar — faqat bo'lim ko'rinadigan va ochiq bo'lganda so'raladi
  // (ruxsati yo'q admin uchun 403 so'rovlari va har sahifada 5 ta COUNT so'rovi bo'lmasin).
  const structureVisible = isAllowed(user, { permissions: ["structure"] });
  const countsEnabled = structureVisible && !collapsed && openParentId === "structure";
  const structureBadges = useQueries({
    queries: STRUCTURE_COUNT_URLS.map((item) => ({
      queryKey: item.key,
      queryFn: () => api.get(item.url).json<Paginated<unknown>>(),
      enabled: countsEnabled,
      staleTime: 5 * 60_000,
    })),
    combine: (results) => {
      const map: Record<string, number | undefined> = {};
      STRUCTURE_COUNT_URLS.forEach((item, i) => {
        map[item.to] = results[i]?.data?.total;
      });
      return map;
    },
  });

  const toggleParent = (id: string) => {
    setOpenParentId((curr) => (curr === id ? null : id));
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          "h-screen flex-col border-r border-slate-200 bg-white text-slate-800 transition-[width] duration-200 select-none dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-200",
          inSheet ? "flex w-full border-r-0" : "hidden md:flex",
          !inSheet && (collapsed ? "w-16" : "w-[260px]"),
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-slate-200/90 px-4 dark:border-slate-800/80",
            collapsed ? "justify-center px-2" : "gap-3",
          )}
        >
          <img src="/favicon.png" alt="CHDPU" className="h-8 w-8 shrink-0 object-contain rounded" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="truncate font-extrabold text-[13px] tracking-tight text-slate-900 dark:text-white">
                {t("adminAdminSidebar.brandTitle")}
              </span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">
                {t("adminAdminSidebar.brandSubtitle")}
              </span>
            </div>
          )}
        </div>

        {/* Cmd+K Quick Search */}
        {!collapsed && (
          <div className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
                );
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Search className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="flex-1 text-left">{t("adminAdminSidebar.searchHint")}</span>
              <kbd className="hidden rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:inline">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation list */}
        <nav className={cn("flex-1 overflow-y-auto space-y-1 custom-scrollbar", collapsed ? "p-2" : "p-3")}>
          {ADMIN_NAV_CONFIG.map((item) => {
            if (!isAllowed(user, item)) return null;

            const visibleChildren = item.children?.filter((c) => isAllowed(user, c));

            // Bolalari bor, lekin birortasi ham ko'rinmasa — bo'lim yashiriladi
            if (item.children && (!visibleChildren || visibleChildren.length === 0)) {
              return null;
            }

            const isCurrentParentActive = isParentActive(item, location.pathname, location.search);
            const isOpen = openParentId === item.id;
            const ItemIcon = item.icon;

            // Direct Link (No children) e.g. Bosh sahifa, Rahbarlar, Murojaatlar
            if (item.to) {
              const isActive = item.end
                ? location.pathname === item.to
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

              const link = (
                <Link
                  key={item.id}
                  to={item.to}
                  aria-label={collapsed ? t(item.labelKey) : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-all group",
                    collapsed ? "h-10 w-10 justify-center" : "gap-3 px-3 py-2",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold border-l-2 border-indigo-600 shadow-xs dark:bg-indigo-600/20 dark:text-white dark:border-indigo-400 dark:shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100",
                  )}
                >
                  <ItemIcon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200",
                    )}
                  />
                  {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                </Link>
              );

              if (!collapsed) return link;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-slate-900 border-slate-700 text-white">
                    {t(item.labelKey)}
                  </TooltipContent>
                </Tooltip>
              );
            }

            // Collapsed mode for Accordion items -> Dropdown menu to access children
            if (collapsed) {
              return (
                <DropdownMenu key={item.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={t(item.labelKey)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg text-sm transition-all group",
                        isCurrentParentActive
                          ? "bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600 dark:bg-indigo-600/20 dark:text-white dark:border-indigo-400"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100",
                      )}
                      title={t(item.labelKey)}
                    >
                      <ItemIcon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isCurrentParentActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200",
                        )}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="right"
                    align="start"
                    className="w-56 bg-white border border-slate-200 text-slate-800 p-1.5 shadow-xl rounded-xl z-50 dark:bg-[#0f172a] dark:border-slate-800 dark:text-slate-200"
                  >
                    <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 py-1.5 dark:text-slate-400">
                      {t(item.labelKey)}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-200 my-1 dark:bg-slate-800" />
                    {visibleChildren?.map((child) => {
                      const active = isChildActive(child, location.pathname, location.search);
                      const ChildIcon = child.icon;
                      return (
                        <DropdownMenuItem key={child.to} asChild className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
                          <Link
                            to={child.to}
                            className={cn(
                              "flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors",
                              active
                                ? "text-indigo-700 bg-indigo-50 font-semibold dark:text-indigo-400 dark:bg-indigo-600/15"
                                : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                            )}
                          >
                            <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{t(child.labelKey)}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            // Expanded Desktop/Mobile mode -> Accordion Parent with smooth 250ms expansion
            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleParent(item.id)}
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group text-left",
                    isCurrentParentActive && !isOpen
                      ? "bg-indigo-50/70 text-indigo-700 font-semibold dark:bg-slate-800/50 dark:text-indigo-300"
                      : isCurrentParentActive && isOpen
                      ? "text-slate-900 font-semibold dark:text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/40 dark:hover:text-white",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ItemIcon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isCurrentParentActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200",
                      )}
                    />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ease-in-out",
                      isOpen && "rotate-90 text-indigo-600 dark:text-indigo-400",
                    )}
                  />
                </button>

                {/* Submenu Accordion Panel */}
                <div
                  className={cn(
                    "overflow-hidden transition-[max-height,opacity] duration-250 ease-in-out pl-4 pr-1",
                    isOpen ? "max-h-[600px] opacity-100 py-1" : "max-h-0 opacity-0 py-0",
                  )}
                >
                  <div className="space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-800/90">
                    {visibleChildren?.map((child) => {
                      const active = isChildActive(child, location.pathname, location.search);
                      const ChildIcon = child.icon;

                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "bg-indigo-50 text-indigo-700 font-semibold border-l-2 border-indigo-600 -ml-[9px] pl-[15px] dark:bg-indigo-600/20 dark:text-white dark:border-indigo-400"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200",
                          )}
                        >
                          <ChildIcon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-colors",
                              active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300",
                            )}
                          />
                          <span className="flex-1 truncate">{t(child.labelKey)}</span>
                          {/* Badge for structure stats */}
                          {structureBadges[child.to] !== undefined && structureBadges[child.to]! > 0 && (
                            <span className={cn(
                              "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                              active
                                ? "bg-indigo-200 text-indigo-800 dark:bg-indigo-500/30 dark:text-indigo-300"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                            )}>
                              {structureBadges[child.to]}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer — Utilities & User profile */}
        <div className={cn("border-t border-slate-200 bg-slate-50/80 dark:border-slate-800/80 dark:bg-[#0b1120]", collapsed ? "p-2" : "p-3")}>
          <div className={cn("mb-2 flex items-center justify-center gap-1.5", collapsed ? "flex-col gap-2" : "")}>
            <NotificationsBell />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <Separator className="my-2 bg-slate-200 dark:bg-slate-800/80" />

          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setProfileOpen(true)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 border border-indigo-200 transition-opacity hover:opacity-80 dark:bg-indigo-600/20 dark:text-indigo-400 dark:border-indigo-500/30"
                    title={t("adminAdminSidebar.myProfile")}
                  >
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      user?.first_name?.[0] ?? "?"
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
                    className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t("adminAdminSidebar.logout")}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setProfileOpen(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 border border-indigo-200 transition-opacity hover:opacity-80 dark:bg-indigo-600/20 dark:text-indigo-400 dark:border-indigo-500/30"
                title={t("adminAdminSidebar.myProfile")}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  user?.first_name?.[0] ?? "?"
                )}
              </button>

              <button
                onClick={() => setProfileOpen(true)}
                className="flex-1 overflow-hidden text-left transition-opacity hover:opacity-80"
              >
                <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                  {user?.full_name ?? t("adminAdminSidebar.roles.admin")}
                </div>
                <div className="truncate text-[10px] text-indigo-600 dark:text-indigo-300/80 font-medium">
                  {user?.role === "super_admin"
                    ? t("adminAdminSidebar.roles.superAdmin")
                    : t("adminAdminSidebar.roles.admin")}
                </div>
              </button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label={t("adminAdminSidebar.logout")}
                title={t("adminAdminSidebar.logout")}
                className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Collapse toggle (Desktop only) */}
          {!inSheet && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="mt-2.5 flex h-7 w-full items-center justify-center gap-1.5 rounded-md text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label={collapsed ? t("adminAdminSidebar.expand") : t("adminAdminSidebar.collapse")}
              title={collapsed ? t("adminAdminSidebar.expand") : t("adminAdminSidebar.collapse")}
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>{t("adminAdminSidebar.collapse")}</span>
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
