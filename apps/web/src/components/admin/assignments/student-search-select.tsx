import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { useStudent, useStudents } from "@/lib/api/students";
import { cn } from "@/lib/utils";

export function normalizeUzbekText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[''ʻ`"]/g, "")
    .trim();
}

export function formatStudentOptionLabel(student: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  hemis_id: string;
  group_name?: string | null;
}): string {
  const name =
    student.full_name ||
    [student.last_name, student.first_name, student.middle_name]
      .filter(Boolean)
      .join(" ") ||
    "";
  const group = student.group_name ? student.group_name : "guruhsiz";
  return `${name} — ${student.hemis_id} — ${group}`;
}

type Props = {
  value: string;
  onValueChange: (id: string) => void;
  allowedCourses?: number[];
  disabled?: boolean;
  placeholder?: string;
};

export function StudentSearchSelect({
  value,
  onValueChange,
  allowedCourses = [],
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

  // Fetch students from API
  const { data: studentsData, isPending } = useStudents(
    {
      course: allowedCourses.length === 1 ? allowedCourses[0] : undefined,
      search: debouncedQuery.trim() || undefined,
    },
    1,
    100,
  );

  const rawStudents = studentsData?.items ?? [];

  // Filter students based on course restriction if multiple courses are allowed
  const filteredByCourse = useMemo(() => {
    if (!allowedCourses.length) return rawStudents;
    return rawStudents.filter((s) => s.course && allowedCourses.includes(s.course));
  }, [rawStudents, allowedCourses]);

  // Client-side search with apostrophe normalization for instant response
  const displayedStudents = useMemo(() => {
    if (!searchQuery.trim()) return filteredByCourse;
    const norm = normalizeUzbekText(searchQuery);
    return filteredByCourse.filter((s) => {
      const fullLabel = formatStudentOptionLabel(s);
      const normLabel = normalizeUzbekText(fullLabel);
      return normLabel.includes(norm);
    });
  }, [filteredByCourse, searchQuery]);

  // Fetch single student info if selected value is not present in displayedStudents list
  const selectedFromList = useMemo(
    () => rawStudents.find((s) => s.id === value),
    [rawStudents, value],
  );
  const singleStudentQuery = useStudent(
    value && !selectedFromList ? value : null,
  );
  const selectedStudent = selectedFromList || singleStudentQuery.data;

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
    placeholder || t("assignmentsAssignmentWizard.studentPlaceholder");

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
          {selectedStudent ? (
            formatStudentOptionLabel(selectedStudent)
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
              placeholder="Qidiruv (F.I.SH. yoki ID)..."
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

          {/* Student List View */}
          <div className="max-h-60 overflow-y-auto p-1">
            {isPending && displayedStudents.length === 0 && (
              <div className="flex h-20 items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">{t("common.loading")}</span>
              </div>
            )}

            {!isPending && displayedStudents.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Talaba topilmadi
              </div>
            )}

            {displayedStudents.map((s) => {
              const isSelected = s.id === value;
              const label = formatStudentOptionLabel(s);
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
