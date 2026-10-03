import { Check, ChevronDown, Loader2, Search } from "lucide-react";
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

import { normalizeSearchText } from "@/components/admin/academic/search-text";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
  /** Ikkinchi qator (masalan, yo'nalish kodi yoki hudud) — qidiruvda ham hisobga olinadi */
  hint?: string;
};

type Props = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: readonly SearchableOption[];
  /** Hech narsa tanlanmagan va `clearLabel` yo'q bo'lsa ko'rinadigan matn */
  placeholder: string;
  /** Berilsa ro'yxat boshida tanlovni bo'shatuvchi variant ("Barcha ...") chiqadi */
  clearLabel?: string;
  /** Tanlangan qiymat joriy variantlar orasida bo'lmasa (server qidiruvi) — trigger matni */
  selectedLabel?: string | null;
  /** Server tomonida qidirish: berilsa mahalliy filtr o'chadi (debounce chaqiruvchida) */
  onSearchChange?: (query: string) => void;
  /** Ro'yxat ochilganda — variantlarni kechiktirib yuklash uchun */
  onOpen?: () => void;
  loading?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  /** Bir vaqtda chiziladigan maksimal variantlar — qolganlari qidiruv bilan topiladi */
  maxVisible?: number;
};

type Item = { kind: "clear" } | { kind: "option"; option: SearchableOption };


/**
 * Qidiruvli tanlash ro'yxati (WAI-ARIA combobox + listbox). Uzun ro'yxatlar (guruhlar,
 * yo'nalishlar, tashkilotlar) uchun — Radix Select'dan farqli o'laroq matn bilan qidiriladi.
 * Ro'yxat portalga emas, joyida chiziladi: Radix Dialog fokus-tuzog'i ichida ham ishlaydi.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  clearLabel,
  selectedLabel,
  onSearchChange,
  onOpen,
  loading = false,
  disabled = false,
  id,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  maxVisible = 100,
}: Props) {
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
  const [dropUp, setDropUp] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeSearchText(query);
    if (onSearchChange || !q) return options;
    return options.filter(
      (o) =>
        normalizeSearchText(o.label).includes(q) ||
        (o.hint ? normalizeSearchText(o.hint).includes(q) : false),
    );
  }, [options, query, onSearchChange]);

  const visible = useMemo(() => filtered.slice(0, maxVisible), [filtered, maxVisible]);
  const hiddenCount = filtered.length - visible.length;

  const items: Item[] = useMemo(
    () => [
      ...(clearLabel && !query ? [{ kind: "clear" } as const] : []),
      ...visible.map((option) => ({ kind: "option", option }) as const),
    ],
    [clearLabel, query, visible],
  );
  // Server javobi kelib ro'yxat qisqarsa ham faol element chegaradan chiqmasin
  const active = Math.min(activeIndex, Math.max(items.length - 1, 0));

  const selectedOption = value ? options.find((o) => o.value === value) : undefined;
  const triggerText = value
    ? (selectedOption?.label ?? selectedLabel ?? null)
    : (clearLabel ?? null);

  const closeList = useCallback(
    (focusTrigger: boolean) => {
      setOpen(false);
      setQuery("");
      onSearchChange?.("");
      if (focusTrigger) triggerRef.current?.focus();
    },
    [onSearchChange],
  );

  const openList = () => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 300 && rect.top > spaceBelow);
    }
    const selectedIndex = items.findIndex((item) =>
      item.kind === "clear" ? !value : item.option.value === value,
    );
    setActiveIndex(Math.max(0, selectedIndex));
    setOpen(true);
    onOpen?.();
  };

  const select = (item: Item) => {
    onChange(item.kind === "clear" ? null : item.option.value);
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

  // Escape: Radix Dialog uni document'ning capture bosqichida ushlaydi — window bosqichida
  // to'xtatamiz, aks holda ro'yxat bilan birga butun dialog yopilib ketadi.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      closeList(true);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
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
      if (item) select(item);
    } else if (e.key === "Tab") {
      closeList(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-sm ring-offset-background",
          "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-destructive",
          open && "ring-1 ring-ring",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !triggerText && "text-muted-foreground")}>
          {triggerText ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
            dropUp ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
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
              aria-label={t("academicSearchableSelect.searchLabel")}
              placeholder={t("academicSearchableSelect.searchPlaceholder")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
                onSearchChange?.(e.target.value);
              }}
              onKeyDown={onInputKeyDown}
              autoComplete="off"
              className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && (
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                aria-label={t("common.loading")}
              />
            )}
          </div>

          <ul
            role="listbox"
            id={listboxId}
            aria-label={ariaLabel ?? placeholder}
            className="max-h-64 overflow-y-auto overscroll-contain p-1"
          >
            {items.map((item, index) => {
              const isSelected =
                item.kind === "clear" ? !value : item.option.value === value;
              const label = item.kind === "clear" ? clearLabel : item.option.label;
              const hint = item.kind === "option" ? item.option.hint : undefined;
              return (
                <li
                  key={item.kind === "clear" ? "__clear__" : item.option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                  className={cn(
                    "flex cursor-pointer select-none items-start gap-2 rounded-sm px-2 py-1.5 text-sm",
                    index === active && "bg-accent text-accent-foreground",
                    item.kind === "clear" && "text-muted-foreground",
                  )}
                >
                  <Check
                    className={cn("mt-0.5 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                    {label}
                    {hint && (
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {items.length === 0 && !loading && (
            <div className="px-3 pb-4 pt-2 text-center text-sm text-muted-foreground">
              {t("academicSearchableSelect.noResults")}
            </div>
          )}
          {hiddenCount > 0 && (
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {t("academicSearchableSelect.moreResults", { n: hiddenCount })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
