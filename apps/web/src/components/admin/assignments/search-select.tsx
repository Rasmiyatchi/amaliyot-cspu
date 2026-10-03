import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export type SearchSelectProps<T> = {
  value: string;
  /** `item` — tanlangan yozuv ("Tanlanmagan" uchun null); tanlov nomini saqlab qolish uchun */
  onValueChange: (value: string, item: T | null) => void;
  /** Ko'rsatiladigan variantlar — server qidiruvi natijasi (qayta filtrlanmaydi) */
  items: readonly T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  /** Joriy qiymatning nomi; `value` bor-u nom hali aniqlanmagan bo'lsa — null (yuklanmoqda) */
  selectedLabel: string | null;
  search: string;
  onSearchChange: (search: string) => void;
  loading: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  /** Berilsa — ro'yxat boshida qiymatni tozalovchi "— (…)" varianti */
  noneLabel?: string;
  /** Trigger ichida tozalash (×) tugmasi */
  clearable?: boolean;
  disabled?: boolean;
  /** Ro'yxat ostidagi izoh (masalan, "faqat birinchi N ta — aniqroq qidiring") */
  hint?: string | null;
  id?: string;
  ariaLabel?: string;
};

type Option<T> = { key: string; label: string; item: T | null };

/**
 * Qidiruvli tanlash (combobox) — talaba/supervizor/tashkilot/hudud/guruh tanlovlari
 * uchun umumiy asos. Klaviatura: ↑/↓ — harakat, Enter — tanlash, Esc — yopish.
 */
export function SearchSelect<T>({
  value,
  onValueChange,
  items,
  getId,
  getLabel,
  selectedLabel,
  search,
  onSearchChange,
  loading,
  placeholder,
  searchPlaceholder,
  emptyText,
  noneLabel,
  clearable = false,
  disabled = false,
  hint,
  id,
  ariaLabel,
}: SearchSelectProps<T>) {
  const { t } = useTranslation();
  const autoId = useId();
  const baseId = id ?? autoId;
  const listboxId = `${baseId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options: Option<T>[] = [
    ...(noneLabel ? [{ key: "", label: `— (${noneLabel})`, item: null }] : []),
    ...items.map((item) => ({ key: getId(item), label: getLabel(item), item })),
  ];
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const close = (focusTrigger: boolean) => {
    setOpen(false);
    onSearchChange("");
    if (focusTrigger) triggerRef.current?.focus();
  };

  // Tashqariga bosilganda yopish
  useEffect(() => {
    if (!open) return;
    const handle = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        onSearchChange("");
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onSearchChange]);

  // Esc — faqat ro'yxatni yopadi. Window capture bosqichida ushlanadi: aks holda Radix
  // Dialog (document capture'da tinglaydi) butun oynani yopib, kiritilgan formani yo'qotardi.
  useEffect(() => {
    if (!open) return;
    const handle = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      onSearchChange("");
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", handle, true);
    return () => window.removeEventListener("keydown", handle, true);
  }, [open, onSearchChange]);

  // Ochilganda qidiruv maydoniga fokus
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Faol variant ko'rinib tursin
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${baseId}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, baseId]);

  const select = (option: Option<T>) => {
    onValueChange(option.key, option.item);
    close(true);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = options[activeIndex];
      if (option) select(option);
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const triggerText = !value ? (
    <span className="text-muted-foreground">{placeholder}</span>
  ) : selectedLabel ? (
    selectedLabel
  ) : (
    <span className="inline-flex items-center text-muted-foreground">
      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      {t("common.loading")}
    </span>
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        id={baseId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (open) close(false);
          else {
            setActiveIndex(0);
            setOpen(true);
          }
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setActiveIndex(0);
            setOpen(true);
          }
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-xs ring-offset-background transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-1 ring-ring",
          clearable && value && "pr-9",
        )}
      >
        <span className="min-w-0 flex-1 truncate font-normal text-foreground">{triggerText}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {clearable && value && !disabled && (
        <button
          type="button"
          onClick={() => onValueChange("", null)}
          className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("common.clear")}
          title={t("common.clear")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 zoom-in-95">
          <div className="flex items-center border-b border-border bg-muted/30 px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={options.length ? optionId(activeIndex) : undefined}
              aria-label={searchPlaceholder}
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder={searchPlaceholder}
              className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading ? (
              <Loader2 className="ml-1 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              search && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange("");
                    inputRef.current?.focus();
                  }}
                  className="ml-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t("common.clear")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>

          <div id={listboxId} role="listbox" className="max-h-60 overflow-y-auto p-1">
            {options.map((option, index) => {
              const selected = option.key === value;
              return (
                <div
                  key={option.key || "__none__"}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  // Fokus qidiruv maydonida qolsin
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-xs outline-none",
                    option.item === null && "text-muted-foreground",
                    index === activeIndex && "bg-accent text-accent-foreground",
                    selected && "font-medium",
                  )}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {selected && <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />}
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="flex items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">{t("common.loading")}</span>
                  </>
                ) : (
                  emptyText
                )}
              </div>
            )}
          </div>

          {hint && (
            <div className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
              {hint}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
