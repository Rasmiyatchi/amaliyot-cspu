import { Monitor, Moon, Sun } from "lucide-react";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
};

const NEXT_THEME = { light: "dark", dark: "system", system: "light" } as const;

const VIEW = {
  light: {
    icon: Sun,
    labelKey: "theme.light",
    nextKey: "theme.switchToDark",
    color: "text-amber-500 hover:text-amber-600 dark:text-amber-400",
  },
  dark: {
    icon: Moon,
    labelKey: "theme.dark",
    nextKey: "theme.switchToSystem",
    color: "text-indigo-500 hover:text-indigo-600 dark:text-indigo-400",
  },
  system: {
    icon: Monitor,
    labelKey: "theme.system",
    nextKey: "theme.switchToLight",
    color: "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
  },
} as const;

export function ThemeToggle({ className, size = "icon" }: ThemeToggleProps): JSX.Element {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const current = VIEW[theme];
  const Icon = current.icon;
  const label = t(current.labelKey);
  const next = t(current.nextKey);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size={size}
            onClick={() => setTheme(NEXT_THEME[theme])}
            aria-label={`${label}. ${next}`}
            className={cn(
              "h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-200/70 active:scale-95 transition-all dark:text-slate-300 dark:hover:bg-slate-800",
              className,
            )}
          >
            <Icon
              className={cn("h-4 w-4 transition-transform duration-300 hover:rotate-12", current.color)}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <span className="font-semibold">{label}</span>
          <span className="block text-[10px] text-muted-foreground mt-0.5">{next}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
