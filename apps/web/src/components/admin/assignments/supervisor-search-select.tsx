import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { useSupervisor, useSupervisors } from "@/lib/api/supervisors";
import { cn } from "@/lib/utils";

export function normalizeUzbekText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[''ʻ`"]/g, "")
    .trim();
}

export type SupervisorOption = {
  full_name?: string | null;
  position?: string | null;
  organization_name?: string | null;
  organizations?: { id: string; name: string }[] | null;
};

export function formatSupervisorOptionLabel(supervisor: SupervisorOption): string {
  const name = supervisor.full_name || "—";
  const pos = supervisor.position ? ` (${supervisor.position})` : "";
  const orgName =
    supervisor.organization_name ||
    (supervisor.organizations && supervisor.organizations.length > 0
      ? supervisor.organizations.map((o) => o.name).join(", ")
      : "");
  const org = orgName ? ` — ${orgName}` : "";
  return `${name}${pos}${org}`;
}

type Props = {
  value: string;
  onValueChange: (id: string) => void;
  organizationId?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function SupervisorSearchSelect({
  value,
  onValueChange,
  organizationId,
  disabled = false,
  placeholder,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query to prevent unnecessary API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch supervisors from API
  const { data: supervisorsData, isPending } = useSupervisors(
    {
      organization_id: organizationId || undefined,
      include_unassigned: true,
      is_active: true,
      search: debouncedQuery.trim() || undefined,
    },
    1,
    200,
  );

  const rawSupervisors = supervisorsData?.items ?? [];

  // Client-side search with apostrophe normalization for instant response
  const displayedSupervisors = useMemo(() => {
    if (!searchQuery.trim()) return rawSupervisors;
    const norm = normalizeUzbekText(searchQuery);
    return rawSupervisors.filter((s) => {
      const fullLabel = formatSupervisorOptionLabel(s);
      const normLabel = normalizeUzbekText(fullLabel);
      return normLabel.includes(norm);
    });
  }, [rawSupervisors, searchQuery]);

  // Selected supervisor object: check list first, then fetch individually if needed
  const selectedFromList = useMemo(
    () => rawSupervisors.find((s) => s.id === value),
    [rawSupervisors, value],
  );

  const singleSupervisorQuery = useSupervisor(
    value && !selectedFromList ? value : null,
  );

  const selectedSupervisor = selectedFromList || singleSupervisorQuery.data;

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Auto focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  const defaultPlaceholder =
    placeholder || t("assignmentsAssignmentWizard.supervisorPlaceholder");

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Select Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-1 ring-ring",
        )}
      >
        <span className="truncate text-left font-normal text-foreground">
          {selectedSupervisor ? (
            formatSupervisorOptionLabel(selectedSupervisor)
          ) : value ? (
            singleSupervisorQuery.isPending ? (
              <span className="inline-flex items-center text-muted-foreground">
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                {t("common.loading")}
              </span>
            ) : (
              formatSupervisorOptionLabel({ full_name: value })
            )
          ) : (
            <span className="text-muted-foreground">{defaultPlaceholder}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onValueChange("");
              }}
              className="mr-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title={t("common.clear")}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </button>

      {/* Select Dropdown Content */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md transition-all animate-in fade-in-80 zoom-in-95">
          {/* Search Input Bar */}
          <div className="flex items-center border-b border-border px-3 py-2 bg-muted/30">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Qidiruv (F.I.SH. yoki lavozim)..."
              className="h-8 border-none bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="ml-1 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Supervisor List View */}
          <div className="max-h-60 overflow-y-auto p-1">
            <div
              onClick={() => {
                onValueChange("");
                setOpen(false);
              }}
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                !value && "bg-accent/60 font-medium text-accent-foreground",
              )}
            >
              <span>— (Tanlanmagan / Standard)</span>
            </div>

            {isPending && displayedSupervisors.length === 0 && (
              <div className="flex h-20 items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">{t("common.loading")}</span>
              </div>
            )}

            {!isPending && displayedSupervisors.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Supervizor topilmadi
              </div>
            )}

            {displayedSupervisors.map((s) => {
              const isSelected = s.id === value;
              const label = formatSupervisorOptionLabel(s);
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    onValueChange(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/60 font-medium text-accent-foreground",
                  )}
                >
                  <span className="flex-1 truncate">{label}</span>
                  {isSelected && (
                    <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
