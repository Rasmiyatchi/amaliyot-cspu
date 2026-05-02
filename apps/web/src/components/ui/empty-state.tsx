import { Inbox, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
  /** Aksent rang — icon va orqa fon uchun. Default 'muted'. */
  accent?: "primary" | "success" | "info" | "warning" | "muted";
};

const ACCENT_CLASSES: Record<
  NonNullable<Props["accent"]>,
  { ring: string; bg: string; icon: string }
> = {
  primary: {
    ring: "ring-primary/20",
    bg: "from-primary/15 via-primary/5 to-transparent",
    icon: "text-primary",
  },
  success: {
    ring: "ring-success/20",
    bg: "from-success/15 via-success/5 to-transparent",
    icon: "text-success",
  },
  info: {
    ring: "ring-info/20",
    bg: "from-info/15 via-info/5 to-transparent",
    icon: "text-info",
  },
  warning: {
    ring: "ring-amber-500/20",
    bg: "from-amber-500/15 via-amber-500/5 to-transparent",
    icon: "text-amber-600 dark:text-amber-400",
  },
  muted: {
    ring: "ring-border",
    bg: "from-muted via-muted/30 to-transparent",
    icon: "text-muted-foreground",
  },
};

/** Umumiy empty state — animatsiya bilan, gradient ring fonli icon. */
export function EmptyState({
  icon: Icon = Inbox,
  title = "Ma'lumot yo'q",
  description,
  action,
  className,
  compact = false,
  accent = "muted",
}: Props) {
  const a = ACCENT_CLASSES[accent];
  return (
    <div
      className={cn(
        "fade-in flex flex-col items-center justify-center gap-3 text-center",
        compact ? "py-6" : "py-12",
        className,
      )}
    >
      <div className="relative">
        {!compact && (
          <>
            <div
              className={cn(
                "pulse-ring absolute inset-0 rounded-full bg-gradient-to-br",
                a.bg,
              )}
            />
            <div
              className={cn(
                "pulse-ring absolute inset-0 rounded-full bg-gradient-to-br",
                a.bg,
              )}
              style={{ animationDelay: "1.2s" }}
            />
          </>
        )}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full bg-gradient-to-br ring-1",
            a.bg,
            a.ring,
            compact ? "h-10 w-10" : "h-16 w-16",
          )}
        >
          <Icon className={cn(compact ? "h-4 w-4" : "h-7 w-7", a.icon)} />
        </div>
      </div>

      <div
        className={cn("font-semibold tracking-tight", compact ? "text-sm" : "text-base")}
      >
        {title}
      </div>

      {description && (
        <div
          className={cn(
            "max-w-sm leading-relaxed text-muted-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {description}
        </div>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Select dropdown ichidagi empty state — SelectContent ichida ishlatiladi. */
export function SelectEmpty({ message = "Ma'lumot yo'q" }: { message?: string }) {
  return (
    <div className="py-4 text-center text-xs text-muted-foreground">{message}</div>
  );
}
