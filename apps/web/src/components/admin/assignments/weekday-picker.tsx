import { cn } from "@/lib/utils";

/** ISO hafta kunlari — backend ham shu raqamlashni kutadi: 1=Dushanba ... 7=Yakshanba */
export const WEEKDAYS = [
  { value: 1, short: "Du", label: "Dushanba" },
  { value: 2, short: "Se", label: "Seshanba" },
  { value: 3, short: "Ch", label: "Chorshanba" },
  { value: 4, short: "Pa", label: "Payshanba" },
  { value: 5, short: "Ju", label: "Juma" },
  { value: 6, short: "Sh", label: "Shanba" },
  { value: 7, short: "Ya", label: "Yakshanba" },
] as const;

const BY_VALUE = new Map<number, (typeof WEEKDAYS)[number]>(
  WEEKDAYS.map((d) => [d.value, d]),
);

/** [1,3] → "Dushanba, Chorshanba" */
export function formatWeekdays(days: number[] | null | undefined): string {
  if (!days || days.length === 0) return "—";
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => BY_VALUE.get(d)?.label ?? String(d))
    .join(", ");
}

type Props = {
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
};

export function WeekdayPicker({ value, onChange, disabled }: Props) {
  const toggle = (day: number) => {
    onChange(
      value.includes(day)
        ? value.filter((d) => d !== day)
        : [...value, day].sort((a, b) => a - b),
    );
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAYS.map((d) => {
        const selected = value.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            disabled={disabled}
            title={d.label}
            aria-pressed={selected}
            onClick={() => toggle(d.value)}
            className={cn(
              "h-9 w-11 rounded-md border text-sm font-medium transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {d.short}
          </button>
        );
      })}
    </div>
  );
}
