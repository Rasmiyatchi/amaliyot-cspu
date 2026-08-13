/* eslint-disable react-refresh/only-export-components -- WEEKDAYS/formatWeekdays picker bilan birga yashaydi */
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";
import { cn } from "@/lib/utils";

/** ISO hafta kunlari — backend ham shu raqamlashni kutadi: 1=Dushanba ... 7=Yakshanba */
export const WEEKDAYS = [
  {
    value: 1,
    shortKey: "assignmentsWeekdayPicker.short.mon",
    labelKey: "assignmentsWeekdayPicker.days.mon",
  },
  {
    value: 2,
    shortKey: "assignmentsWeekdayPicker.short.tue",
    labelKey: "assignmentsWeekdayPicker.days.tue",
  },
  {
    value: 3,
    shortKey: "assignmentsWeekdayPicker.short.wed",
    labelKey: "assignmentsWeekdayPicker.days.wed",
  },
  {
    value: 4,
    shortKey: "assignmentsWeekdayPicker.short.thu",
    labelKey: "assignmentsWeekdayPicker.days.thu",
  },
  {
    value: 5,
    shortKey: "assignmentsWeekdayPicker.short.fri",
    labelKey: "assignmentsWeekdayPicker.days.fri",
  },
  {
    value: 6,
    shortKey: "assignmentsWeekdayPicker.short.sat",
    labelKey: "assignmentsWeekdayPicker.days.sat",
  },
  {
    value: 7,
    shortKey: "assignmentsWeekdayPicker.short.sun",
    labelKey: "assignmentsWeekdayPicker.days.sun",
  },
] as const;

const BY_VALUE = new Map<number, (typeof WEEKDAYS)[number]>(
  WEEKDAYS.map((d) => [d.value, d]),
);

/** [1,3] → "Dushanba, Chorshanba" */
export function formatWeekdays(days: number[] | null | undefined): string {
  if (!days || days.length === 0) return "—";
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => {
      const day = BY_VALUE.get(d);
      return day ? i18n.t(day.labelKey) : String(d);
    })
    .join(", ");
}

type Props = {
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
};

export function WeekdayPicker({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();
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
            title={t(d.labelKey)}
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
            {t(d.shortKey)}
          </button>
        );
      })}
    </div>
  );
}
