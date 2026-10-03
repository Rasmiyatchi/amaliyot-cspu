import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export type BulkDeleteFailure = { id: string; full_name: string | null; error: string };

type Props = {
  failures: BulkDeleteFailure[];
  onDismiss: () => void;
};

/**
 * Ommaviy o'chirishda o'chmay qolgan yozuvlar — har biri sababi bilan (masalan, 409:
 * "amaliyot tarixi bor"). Toast tez yo'qolgani uchun foydalanuvchi yopguncha turadi.
 */
export function BulkDeleteFailures({ failures, onDismiss }: Props) {
  const { t } = useTranslation();
  if (failures.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-3">
      <div className="flex items-start justify-between gap-2">
        <AlertTitle className="leading-snug">
          {t("studentsBulkDeleteFailures.title", { n: failures.length })}
        </AlertTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mr-2 -mt-1 h-7 w-7 shrink-0 text-destructive hover:text-destructive"
          onClick={onDismiss}
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <AlertDescription>
        <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto text-xs">
          {failures.map((f) => (
            <li key={f.id} className="break-words [overflow-wrap:anywhere]">
              <span className="font-medium">
                {f.full_name ?? t("studentsBulkDeleteFailures.unknownName")}
              </span>
              {" — "}
              {f.error}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
