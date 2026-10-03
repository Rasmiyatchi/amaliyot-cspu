import {
  BarChart3,
  BookOpen,
  Building,
  Building2,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  ClipboardEdit,
  ClipboardList,
  Cog,
  Compass,
  Database,
  FileCheck2,
  Layers,
  LayoutDashboard,
  LibraryBig,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore, type User } from "@/stores/auth";

type CmdGroup = "adminCommandPalette.groups.pages" | "adminCommandPalette.groups.quickActions";

type Cmd = {
  id: string;
  labelKey: string;
  to: string;
  icon: LucideIcon;
  keywords?: string[];
  superAdminOnly?: boolean;
  /** Admin uchun: ro'yxatdagi ruxsatlardan BIRI yetarli (router `Protected` bilan bir xil) */
  permissions?: string[];
  group: CmdGroup;
};

const PAGES: CmdGroup = "adminCommandPalette.groups.pages";
const QUICK: CmdGroup = "adminCommandPalette.groups.quickActions";
const STRUCTURE = ["structure"];
const PRACTICE = ["practice"];
const CONTRACTS = ["contracts", "practice"];

const COMMANDS: Cmd[] = [
  { id: "home", labelKey: "adminCommandPalette.pages.home", to: "/admin", icon: LayoutDashboard, keywords: ["dashboard", "asosiy", "главная"], group: PAGES },
  { id: "faculties", labelKey: "adminAdminSidebar.nav.faculties", to: "/admin/structure/faculties", icon: Building, keywords: ["fakultet", "faculty", "tuzilma"], permissions: STRUCTURE, group: PAGES },
  { id: "departments", labelKey: "adminAdminSidebar.nav.departments", to: "/admin/structure/departments", icon: Layers, keywords: ["kafedra", "department"], permissions: STRUCTURE, group: PAGES },
  { id: "directions", labelKey: "adminAdminSidebar.nav.directions", to: "/admin/structure/directions", icon: Compass, keywords: ["yo'nalish", "mutaxassislik", "direction"], permissions: STRUCTURE, group: PAGES },
  { id: "groups", labelKey: "adminAdminSidebar.nav.groups", to: "/admin/structure/groups", icon: Users, keywords: ["guruh", "group"], permissions: STRUCTURE, group: PAGES },
  { id: "academic-years", labelKey: "adminAdminSidebar.nav.academicYears", to: "/admin/structure/academic-years", icon: Calendar, keywords: ["o'quv yili", "academic year"], permissions: STRUCTURE, group: PAGES },
  { id: "students", labelKey: "common.students", to: "/admin/structure/students", icon: Users, keywords: ["student", "talaba", "hemis"], permissions: STRUCTURE, group: PAGES },
  { id: "practice-types", labelKey: "adminCommandPalette.pages.practiceTypes", to: "/admin/practice-types", icon: BookOpen, keywords: ["practice", "tur"], permissions: PRACTICE, group: PAGES },
  { id: "assignments", labelKey: "adminCommandPalette.pages.assignments", to: "/admin/assignments", icon: ClipboardList, keywords: ["assignment", "amaliyot", "biriktirish"], permissions: PRACTICE, group: PAGES },
  { id: "applications", labelKey: "adminAdminSidebar.nav.applications", to: "/admin/applications", icon: ClipboardEdit, keywords: ["ariza", "application"], permissions: CONTRACTS, group: PAGES },
  { id: "contracts", labelKey: "adminCommandPalette.pages.contracts", to: "/admin/contracts", icon: FileCheck2, keywords: ["qr", "contract", "shartnoma"], permissions: CONTRACTS, group: PAGES },
  { id: "attendance", labelKey: "adminCommandPalette.pages.attendance", to: "/admin/attendance", icon: CalendarCheck, keywords: ["kelish", "ketish", "davomat"], permissions: PRACTICE, group: PAGES },
  { id: "task-templates", labelKey: "adminCommandPalette.pages.tasks", to: "/admin/task-templates", icon: LibraryBig, keywords: ["task", "shablon", "topshiriq"], permissions: PRACTICE, group: PAGES },
  { id: "documents", labelKey: "adminCommandPalette.pages.documents", to: "/admin/documents", icon: BookOpen, keywords: ["normativ", "dastur", "regulation", "program", "pdf"], permissions: PRACTICE, group: PAGES },
  { id: "reports", labelKey: "adminCommandPalette.pages.reports", to: "/admin/reports", icon: FileCheck2, keywords: ["report", "yakuniy", "hisobot"], permissions: PRACTICE, group: PAGES },
  { id: "records", labelKey: "adminAdminSidebar.nav.records", to: "/admin/records", icon: ClipboardCheck, keywords: ["qaydnoma", "baho", "ведомость"], permissions: PRACTICE, group: PAGES },
  { id: "supervisors", labelKey: "adminCommandPalette.pages.supervisors", to: "/admin/supervisors", icon: UserCog, keywords: ["supervisor", "rahbar"], permissions: ["supervisors"], group: PAGES },
  { id: "organizations", labelKey: "adminAdminSidebar.nav.organizations", to: "/admin/objects?tab=organizations", icon: Building2, keywords: ["tashkilot", "maktab", "obyekt"], permissions: ["partners"], group: PAGES },
  { id: "areas", labelKey: "adminAdminSidebar.nav.areas", to: "/admin/objects?tab=areas", icon: MapPin, keywords: ["hudud", "area", "obyekt"], permissions: ["partners"], group: PAGES },
  { id: "monitoring", labelKey: "adminAdminSidebar.nav.monitoring", to: "/admin/monitoring", icon: BarChart3, keywords: ["monitoring", "tahlil", "xarita", "statistika"], permissions: ["monitoring"], group: PAGES },
  { id: "inquiries", labelKey: "adminAdminSidebar.nav.inquiries", to: "/admin/inquiries", icon: MessageSquare, keywords: ["murojaat", "inquiry"], permissions: ["inquiries"], group: PAGES },
  { id: "integrations", labelKey: "adminAdminSidebar.nav.integrations", to: "/admin/integrations", icon: Database, keywords: ["hemis", "integratsiya", "api"], permissions: ["system"], group: PAGES },
  { id: "admins", labelKey: "adminCommandPalette.pages.admins", to: "/admin/admins", icon: ShieldCheck, superAdminOnly: true, group: PAGES },
  { id: "settings", labelKey: "adminCommandPalette.pages.settings", to: "/admin/system-settings", icon: Cog, superAdminOnly: true, keywords: ["maintenance", "profilaktika"], group: PAGES },

  // Tezkor amallar
  { id: "qa-new-student", labelKey: "adminCommandPalette.quickActions.newStudent", to: "/admin/structure/students?new=1", icon: Users, permissions: STRUCTURE, group: QUICK },
  { id: "qa-new-supervisor", labelKey: "adminCommandPalette.quickActions.newSupervisor", to: "/admin/supervisors?new=1", icon: UserCog, permissions: ["supervisors"], group: QUICK },
  { id: "qa-new-assign", labelKey: "adminCommandPalette.quickActions.newAssignment", to: "/admin/assignments?new=1", icon: ClipboardList, permissions: PRACTICE, group: QUICK },
];

/** Router `Protected` va backend `require_permission` bilan bir xil qoida. */
function isAllowed(user: User | null, cmd: Cmd): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (cmd.superAdminOnly) return false;
  if (!cmd.permissions || cmd.permissions.length === 0) return true;
  const perms = user.permissions ?? [];
  return cmd.permissions.some(
    (p) => perms.includes(p) || (p === "contracts" && perms.includes("practice")),
  );
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/['’‘ʻʼ`]/g, "");
}

export function CommandPalette() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Guruh tartibida tekis ro'yxat — klaviatura indeksi ko'rinish tartibiga mos keladi
  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const map = new Map<CmdGroup, Cmd[]>();
    for (const c of COMMANDS) {
      if (!isAllowed(user, c)) continue;
      if (q) {
        const haystack = normalize([t(c.labelKey), ...(c.keywords ?? [])].join(" "));
        if (!haystack.includes(q)) continue;
      }
      const arr = map.get(c.group) ?? [];
      arr.push(c);
      map.set(c.group, arr);
    }
    return Array.from(map.entries());
  }, [query, user, t]);

  const flat = useMemo(() => groups.flatMap(([, items]) => items), [groups]);

  function execute(c: Cmd) {
    setOpen(false);
    navigate(c.to);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = flat[activeIdx];
      if (c) execute(c);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[20%] max-w-xl translate-y-0 gap-0 p-0"
        showClose={false}
      >
        <DialogTitle className="sr-only">{t("adminCommandPalette.srTitle")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("adminCommandPalette.srDescription")}
        </DialogDescription>

        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t("adminCommandPalette.searchPlaceholder")}
            aria-label={t("adminCommandPalette.searchPlaceholder")}
            className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {groups.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("adminCommandPalette.noResults")}
            </div>
          )}

          {groups.map(([group, items]) => (
            <div key={group} className="mb-2 last:mb-0">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(group)}
              </div>
              {items.map((c) => {
                const index = flat.indexOf(c);
                const isActive = index === activeIdx;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => execute(c)}
                    onMouseEnter={() => setActiveIdx(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <c.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                    <span className="flex-1 truncate">{t(c.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">↑↓</kbd>
              {t("adminCommandPalette.footerNavigate")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">⏎</kbd>
              {t("adminCommandPalette.footerOpen")}
            </span>
          </div>
          <span className="hidden sm:inline">⌘K / Ctrl+K</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
