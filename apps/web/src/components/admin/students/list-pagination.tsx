import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** So'rov ketayotganda tugmalar bloklanadi */
  disabled?: boolean;
  className?: string;
};

/**
 * Ro'yxatlar uchun umumiy sahifalash: "1–50 / 260", Oldingi / Keyingi.
 * O'chirish yoki filtr natijasida joriy sahifa oxirgisidan oshib ketsa — oxirgi sahifaga qaytaradi.
 */
export function ListPagination({ page, pageSize, total, onPageChange, disabled, className }: Props) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) onPageChange(totalPages);
  }, [page, totalPages, onPageChange]);

  if (total <= 0) return null;

  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <div>
        <span className="font-medium text-foreground tabular-nums">
          {from}–{to}
        </span>{" "}
        / <span className="tabular-nums">{total}</span>
      </div>
      <nav aria-label={t("studentsListPagination.label")} className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || disabled}
        >
          <ChevronLeft className="h-4 w-4" />
          {t("common.previous")}
        </Button>
        <span className="px-1 tabular-nums" aria-live="polite">
          {t("studentsListPagination.pageOf", { page, total: totalPages })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || disabled}
        >
          {t("common.next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}
