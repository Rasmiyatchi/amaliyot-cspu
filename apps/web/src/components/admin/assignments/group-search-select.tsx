import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { useGroups } from "@/lib/api/academic";
import { cn } from "@/lib/utils";

export function normalizeUzbekText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[''ʻ`"]/g, "")
    .trim();
}

export function formatGroupOptionLabel(
  group: { name: string; course: number },
  courseLabel = "kurs",
): string {
  return `${group.name} (${group.course}-${courseLabel})`;
}

type Props = {
  value: string;
  onValueChange: (id: string) => void;
  allowedCourses?: number[];
  disabled?: boolean;
  placeholder?: string;
};

export function GroupSearchSelect({
  value,
  onValueChange,
  allowedCourses = [],
  disabled = false,
  placeholder,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const groupsQuery = useGroups({}, 1, 200);
  const rawGroups = groupsQuery.data?.items ?? [];

  // Allowed courses filter
  const courseFilteredGroups = useMemo(() => {
    if (!allowedCourses.length) return rawGroups;
    return rawGroups.filter((g) => allowedCourses.includes(g.course));
  }, [rawGroups, allowedCourses]);

  // Client-side search with Uzbek normalization
  const displayedGroups = useMemo(() => {
    if (!searchQuery.trim()) return courseFilteredGroups;
    const norm = normalizeUzbekText(searchQuery);
    return courseFilteredGroups.filter((g) => {
      const label = formatGroupOptionLabel(
        g,
        t("common.courseShort", { defaultValue: "kurs" }),
      );
      const normLabel = normalizeUzbekText(label);
      const normName = normalizeUzbekText(g.name);
      return normLabel.includes(norm) || normName.includes(norm);
    });
  }, [courseFilteredGroups, searchQuery, t]);

  const selectedGroup = useMemo(
    () => rawGroups.find((g) => g.id === value),
    [rawGroups, value],
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
    }
  }, [open]);

  const defaultPlaceholder =
    placeholder || t("assignmentsAssignmentWizard.groupPlaceholder");

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
          {selectedGroup ? (
            formatGroupOptionLabel(
              selectedGroup,
              t("common.courseShort", { defaultValue: "kurs" }),
            )
          ) : (
            <span className="text-muted-foreground">{defaultPlaceholder}</span>
          )}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
              placeholder={t("common.search", { defaultValue: "Qidiruv..." })}
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

          {/* Group List View */}
          <div className="max-h-60 overflow-y-auto p-1">
            {groupsQuery.isPending && displayedGroups.length === 0 && (
              <div className="flex h-20 items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">{t("common.loading")}</span>
              </div>
            )}

            {!groupsQuery.isPending && displayedGroups.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {allowedCourses.length && courseFilteredGroups.length === 0
                  ? t("assignmentsAssignmentWizard.noCourseGroups", {
                      courses: allowedCourses.join(", "),
                    })
                  : t("assignmentsAssignmentWizard.noGroups", {
                      defaultValue: "Guruh topilmadi",
                    })}
              </div>
            )}

            {displayedGroups.map((g) => {
              const isSelected = g.id === value;
              const label = formatGroupOptionLabel(
                g,
                t("common.courseShort", { defaultValue: "kurs" }),
              );
              return (
                <div
                  key={g.id}
                  onClick={() => {
                    onValueChange(g.id);
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
