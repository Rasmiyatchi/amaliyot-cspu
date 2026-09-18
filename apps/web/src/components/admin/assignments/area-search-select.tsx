import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { useAreas } from "@/lib/api/areas";
import type { Area } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function normalizeUzbekText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[''ʻ`"]/g, "")
    .trim();
}

export function formatAreaOptionLabel(area: Partial<Area>): string {
  if (!area.name) return "";
  const locationParts = [area.region, area.district].filter(Boolean);
  const location = locationParts.length > 0 ? ` (${locationParts.join(", ")})` : "";
  return `${area.name}${location}`;
}

type Props = {
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function AreaSearchSelect({
  value,
  onValueChange,
  disabled = false,
  placeholder,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query for API call
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: areasData, isPending } = useAreas(
    {
      is_active: true,
      search: debouncedQuery.trim() || undefined,
    },
    1,
    100,
  );

  const rawAreas = areasData?.items ?? [];

  // Client-side instant filter with Uzbek character normalization
  const displayedAreas = useMemo(() => {
    if (!searchQuery.trim()) return rawAreas;
    const norm = normalizeUzbekText(searchQuery);
    return rawAreas.filter((a) => {
      const fullLabel = formatAreaOptionLabel(a);
      const normLabel = normalizeUzbekText(fullLabel);
      return normLabel.includes(norm);
    });
  }, [rawAreas, searchQuery]);

  const selectedArea = useMemo(
    () => rawAreas.find((a) => a.id === value),
    [rawAreas, value],
  );

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
    placeholder || t("assignmentsAssignmentWizard.areaPlaceholder");

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
          {selectedArea ? (
            formatAreaOptionLabel(selectedArea)
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
              title={t("common.clear", { defaultValue: "Tozalash" })}
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
              placeholder={t("common.search", { defaultValue: "Qidiruv (hudud, tuman)..." })}
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

          {/* Area List View */}
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
              <span>— ({t("common.none", { defaultValue: "Tanlanmagan" })})</span>
            </div>

            {isPending && displayedAreas.length === 0 && (
              <div className="flex h-20 items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">{t("common.loading")}</span>
              </div>
            )}

            {!isPending && displayedAreas.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("assignmentsAssignmentWizard.noAreas", {
                  defaultValue: "Hudud topilmadi",
                })}
              </div>
            )}

            {displayedAreas.map((a) => {
              const isSelected = a.id === value;
              const label = formatAreaOptionLabel(a);
              return (
                <div
                  key={a.id}
                  onClick={() => {
                    onValueChange(a.id);
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
