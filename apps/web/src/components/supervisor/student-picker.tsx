import { Check, ChevronDown, Search, Users } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";

import type { PracticeAssignment, UUID } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Props = {
  assignments: readonly PracticeAssignment[];
  /** null — barcha talabalar */
  value: UUID | null;
  onChange: (assignmentId: UUID | null) => void;
  className?: string;
};

type Item =
  | { kind: "all" }
  | { kind: "student"; assignment: PracticeAssignment; hint: string };

/** Qidiruv uchun: kichik harf, apostrof turlari (o'/oʻ/o‘) farqsiz. */
function normalize(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/['`ʻʼ‘’"]/g, "")
    .trim();
}

/**
 * Talabani tanlash — F.I.SH., HEMIS ID yoki guruh bo'yicha qidiruvli ro'yxat
 * (WAI-ARIA combobox + listbox). 30–40 ta talabada ham ixcham, telefonda ham qulay.
 */
export function StudentPicker({ assignments, value, onChange, className }: Props) {
  const { t } = useTranslation();
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Bir talabaning bir nechta biriktirishi bo'lsa (masalan, ikki semestr) — farqlash uchun
  // amaliyot turi va semestr ham ko'rsatiladi.
  const options = useMemo(() => {
    const perStudent = new Map<UUID, number>();
    for (const a of assignments) {
      perStudent.set(a.student_id, (perStudent.get(a.student_id) ?? 0) + 1);
    }
    return assignments.map((a) => {
      const parts = [a.student_hemis_id, a.student_group_name ?? t("supervisorStudents.noGroup")];
      if ((perStudent.get(a.student_id) ?? 0) > 1) {
        parts.push(
          a.semester
            ? `${a.practice_type_name} (${t(`supervisorStudents.semesterShort.${a.semester}`)})`
            : a.practice_type_name,
        );
      }
      return { assignment: a, hint: parts.join(" · ") };
    });
  }, [assignments, t]);

  const items: Item[] = useMemo(() => {
    const q = normalize(query);
    const matched = q
      ? options.filter(
          (o) =>
            normalize(o.assignment.student_full_name).includes(q) ||
            normalize(o.assignment.student_hemis_id).includes(q) ||
            normalize(o.assignment.student_group_name ?? "").includes(q),
        )
      : options;
    return [
      ...(q ? [] : [{ kind: "all" } as const]),
      ...matched.map((o) => ({ kind: "student", assignment: o.assignment, hint: o.hint }) as const),
    ];
  }, [options, query]);

  const active = Math.min(activeIndex, Math.max(items.length - 1, 0));
  const selected = value ? assignments.find((a) => a.id === value) : undefined;

  const closeList = useCallback((focusTrigger: boolean) => {
    setOpen(false);
    setQuery("");
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const openList = () => {
    const selectedIndex = items.findIndex((item) =>
      item.kind === "all" ? !value : item.assignment.id === value,
    );
    setActiveIndex(Math.max(0, selectedIndex));
    setOpen(true);
  };

  const choose = (item: Item) => {
    onChange(item.kind === "all" ? null : item.assignment.id);
    closeList(true);
  };

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Tashqariga bosilsa yopiladi
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) closeList(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, closeList]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${baseId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, baseId]);

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) {
      e.preventDefault();
      openList();
    }
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(Math.min(active + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) choose(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeList(true);
    } else if (e.key === "Tab") {
      closeList(false);
    }
  };

  const triggerLabel = selected
    ? `${selected.student_full_name} · ${selected.student_hemis_id}`
    : t("supervisor.picker.allStudents", { count: assignments.length });

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`${t("supervisor.picker.label")}: ${triggerLabel}`}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm ring-offset-background",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          open && "ring-1 ring-ring",
        )}
      >
        <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={items.length > 0 ? optionId(active) : undefined}
              aria-label={t("supervisor.picker.searchLabel")}
              placeholder={t("supervisor.picker.searchPlaceholder")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
              autoComplete="off"
              className="h-10 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <ul
            role="listbox"
            id={listboxId}
            aria-label={t("supervisor.picker.label")}
            className="max-h-72 overflow-y-auto overscroll-contain p-1"
          >
            {items.map((item, index) => {
              const isSelected = item.kind === "all" ? !value : item.assignment.id === value;
              return (
                <li
                  key={item.kind === "all" ? "__all__" : item.assignment.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex cursor-pointer select-none items-start gap-2 rounded-sm px-2 py-1.5 text-sm",
                    index === active && "bg-accent text-accent-foreground",
                  )}
                >
                  <Check
                    className={cn("mt-0.5 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                    aria-hidden="true"
                  />
                  {item.kind === "all" ? (
                    <span className="min-w-0 flex-1 font-medium">
                      {t("supervisor.picker.allStudents", { count: assignments.length })}
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                      {item.assignment.student_full_name}
                      <span className="block text-xs text-muted-foreground">{item.hint}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {items.length === 0 && (
            <div className="px-3 pb-4 pt-2 text-center text-sm text-muted-foreground">
              {t("supervisor.picker.noResults")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
