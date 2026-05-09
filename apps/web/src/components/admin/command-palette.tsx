import {
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardList,
  Cog,
  FileCheck2,
  LayoutDashboard,
  LibraryBig,
  Search,
  School,
  ShieldCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

type Cmd = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  keywords?: string[];
  superAdminOnly?: boolean;
  group: "Sahifalar" | "Tezkor amallar";
};

const COMMANDS: Cmd[] = [
  { id: "home", label: "Bosh sahifa", to: "/admin", icon: LayoutDashboard, keywords: ["dashboard", "asosiy"], group: "Sahifalar" },
  { id: "academic", label: "Akademik", to: "/admin/academic", icon: School, keywords: ["fakultet", "yo'nalish", "guruh"], group: "Sahifalar" },
  { id: "ptype", label: "Amaliyot turlari", to: "/admin/practice-types", icon: BookOpen, keywords: ["practice", "tur"], group: "Sahifalar" },
  { id: "objects", label: "Obyektlar", to: "/admin/objects", icon: Building2, keywords: ["tashkilot", "hudud", "maktab"], group: "Sahifalar" },
  { id: "supervisors", label: "Rahbarlar", to: "/admin/supervisors", icon: UserCog, keywords: ["supervisor"], group: "Sahifalar" },
  { id: "students", label: "Talabalar", to: "/admin/students", icon: Users, keywords: ["student", "hemis"], group: "Sahifalar" },
  { id: "assignments", label: "Biriktirish", to: "/admin/assignments", icon: ClipboardList, keywords: ["assignment", "amaliyot"], group: "Sahifalar" },
  { id: "contracts", label: "Shartnomalar", to: "/admin/contracts", icon: FileCheck2, keywords: ["qr", "contract"], group: "Sahifalar" },
  { id: "attendance", label: "Davomat", to: "/admin/attendance", icon: CalendarCheck, keywords: ["kelish", "ketish"], group: "Sahifalar" },
  { id: "tasks", label: "Topshiriqlar", to: "/admin/task-templates", icon: LibraryBig, keywords: ["task", "shablon"], group: "Sahifalar" },
  { id: "documents", label: "Hujjatlar", to: "/admin/documents", icon: BookOpen, keywords: ["normativ", "dastur", "regulation", "program", "pdf"], group: "Sahifalar" },
  { id: "reports", label: "Yakuniy hisobotlar", to: "/admin/reports", icon: FileCheck2, keywords: ["report", "yakuniy", "tasdiq"], group: "Sahifalar" },
  { id: "admins", label: "Adminlar", to: "/admin/admins", icon: ShieldCheck, superAdminOnly: true, group: "Sahifalar" },
  { id: "settings", label: "Sozlamalar", to: "/admin/system-settings", icon: Cog, superAdminOnly: true, keywords: ["maintenance", "profilaktika"], group: "Sahifalar" },

  // Quick actions
  { id: "qa-new-student", label: "Yangi talaba qo'shish", to: "/admin/students?new=1", icon: Users, group: "Tezkor amallar" },
  { id: "qa-new-supervisor", label: "Yangi supervizor qo'shish", to: "/admin/supervisors?new=1", icon: UserCog, group: "Tezkor amallar" },
  { id: "qa-new-assign", label: "Yangi biriktirish", to: "/admin/assignments?new=1", icon: ClipboardList, group: "Tezkor amallar" },
];

function fuzzyMatch(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return text.toLowerCase().includes(q);
}

export function CommandPalette() {
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

  const filtered = useMemo(() => {
    return COMMANDS.filter((c) => {
      if (c.superAdminOnly && user?.role !== "super_admin") return false;
      if (!query) return true;
      const haystack = [c.label, ...(c.keywords ?? [])].join(" ");
      return fuzzyMatch(haystack, query);
    });
  }, [query, user?.role]);

  const groups = useMemo(() => {
    const map = new Map<string, Cmd[]>();
    for (const c of filtered) {
      const arr = map.get(c.group) ?? [];
      arr.push(c);
      map.set(c.group, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function execute(c: Cmd) {
    setOpen(false);
    navigate(c.to);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtered[activeIdx];
      if (c) execute(c);
    }
  }

  let runningIdx = -1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[20%] max-w-xl translate-y-0 gap-0 p-0"
        showClose={false}
      >
        <DialogTitle className="sr-only">Tezkor qidiruv</DialogTitle>
        <DialogDescription className="sr-only">
          Sahifa nomini yozing yoki tugmalardan foydalaning
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
            placeholder="Sahifa, amal yoki kalit so'z..."
            className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {groups.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Hech narsa topilmadi
            </div>
          )}

          {groups.map(([group, items]) => (
            <div key={group} className="mb-2 last:mb-0">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </div>
              {items.map((c) => {
                runningIdx++;
                const isActive = runningIdx === activeIdx;
                return (
                  <button
                    key={c.id}
                    onClick={() => execute(c)}
                    onMouseEnter={() => setActiveIdx(runningIdx)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <c.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                    <span className="flex-1 truncate">{c.label}</span>
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
              o'tish
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">⏎</kbd>
              ochish
            </span>
          </div>
          <span className="hidden sm:inline">Cmd+K</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
