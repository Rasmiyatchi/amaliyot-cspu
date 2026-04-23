import { Monitor, Moon, Sun } from "lucide-react";
import type { JSX } from "react";

import { useTheme, type Theme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const options: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

export function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-label={label}
          aria-pressed={theme === value}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            "hover:bg-muted",
            theme === value
              ? "bg-primary text-primary-foreground hover:bg-primary"
              : "text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
