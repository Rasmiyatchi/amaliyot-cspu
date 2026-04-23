import { Inbox, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
};

/** Umumiy empty state — jadvallar, ro'yxatlar, dropdown'lar uchun. */
export function EmptyState({
  icon: Icon = Inbox,
  title = "Ma'lumot yo'q",
  description,
  action,
  className,
  compact = false,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center",
        compact ? "py-6" : "py-12",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          compact ? "h-8 w-8" : "h-12 w-12",
        )}
      >
        <Icon className={compact ? "h-4 w-4" : "h-6 w-6"} />
      </div>
      <div className={cn("font-medium", compact && "text-sm")}>{title}</div>
      {description && (
        <div className="max-w-xs text-xs text-muted-foreground">{description}</div>
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
