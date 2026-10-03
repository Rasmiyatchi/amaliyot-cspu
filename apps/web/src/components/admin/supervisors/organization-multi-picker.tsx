import { Loader2, Search, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useOrganizations } from "@/lib/api/organizations";
import type { OrganizationRef } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const RESULTS_PAGE_SIZE = 20;

type Props = {
  value: OrganizationRef[];
  onChange: (next: OrganizationRef[]) => void;
  max: number;
  /** Qidiruv maydoniga (FormControl/FormLabel bilan bog'lanadi) */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
};

/**
 * Supervizor tashkilotlari: server tomonida qidiriladi (birinchi N ta bilan cheklanmaydi),
 * tanlanganlar nomi bilan chip sifatida ko'rinadi — ro'yxatda bo'lmasa ham.
 */
export function OrganizationMultiPicker({
  value,
  onChange,
  max,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const search = useDebounce(query.trim(), 300);
  const orgs = useOrganizations(
    { search: search || undefined, is_active: true },
    1,
    RESULTS_PAGE_SIZE,
  );
  const results = orgs.data?.items ?? [];
  const total = orgs.data?.total ?? 0;
  const selectedIds = new Set(value.map((o) => o.id));
  const atLimit = value.length >= max;

  const add = (org: OrganizationRef) => {
    if (selectedIds.has(org.id) || atLimit) return;
    onChange([...value, { id: org.id, name: org.name }]);
  };
  const remove = (orgId: string) => onChange(value.filter((o) => o.id !== orgId));

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul
          className="flex flex-wrap gap-1.5"
          aria-label={t("supervisorsSupervisorFormDialog.selectedOrganizations")}
        >
          {value.map((o) => (
            <li key={o.id} className="max-w-full">
              <Badge variant="secondary" className="max-w-full gap-1 pr-1">
                <span className="truncate">{o.name}</span>
                <button
                  type="button"
                  onClick={() => remove(o.id)}
                  disabled={disabled}
                  className="shrink-0 rounded-sm p-0.5 hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t("supervisorsSupervisorFormDialog.removeOrganization", {
                    name: o.name,
                  })}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("supervisorsSupervisorFormDialog.orgSearchPlaceholder")}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className="pl-8"
          autoComplete="off"
        />
        {orgs.isFetching && (
          <Loader2
            className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-label={t("common.loading")}
          />
        )}
      </div>

      <div
        role="group"
        aria-label={t("supervisorsSupervisorFormDialog.orgResults")}
        className="max-h-48 space-y-0.5 overflow-y-auto rounded-md border border-border p-1.5"
      >
        {orgs.isPending && (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        {!orgs.isPending && results.length === 0 && (
          <div className="px-1.5 py-2 text-sm text-muted-foreground">
            {t("supervisorsSupervisorFormDialog.noOrganizations")}
          </div>
        )}
        {results.map((o) => {
          const checked = selectedIds.has(o.id);
          const blocked = !checked && atLimit;
          const place = [o.region, o.district].filter(Boolean).join(", ");
          return (
            <label
              key={o.id}
              className={cn(
                "flex items-start gap-2 rounded px-1.5 py-1 text-sm",
                blocked || disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/60",
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                checked={checked}
                disabled={blocked || disabled}
                onChange={(e) => (e.target.checked ? add(o) : remove(o.id))}
              />
              <span className="min-w-0 flex-1">
                <span className="block break-words">{o.name}</span>
                {place && <span className="block text-xs text-muted-foreground">{place}</span>}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {atLimit && <span>{t("supervisorsSupervisorFormDialog.maxOrganizations")}</span>}
        {total > results.length && (
          <span>
            {t("supervisorsSupervisorFormDialog.orgMoreResults", {
              shown: results.length,
              total,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
