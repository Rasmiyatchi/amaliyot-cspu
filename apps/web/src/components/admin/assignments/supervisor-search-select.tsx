import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SearchSelect } from "@/components/admin/assignments/search-select";
import { useDebounce } from "@/hooks/use-debounce";
import { useSupervisor, useSupervisors } from "@/lib/api/supervisors";
import type { Supervisor } from "@/lib/api/types";

const PAGE_SIZE = 50;

type Props = {
  value: string;
  onValueChange: (id: string) => void;
  /** Berilsa — shu tashkilot supervizorlari (+ tashkilotga bog'lanmaganlar) */
  organizationId?: string;
  /** Filtrlar uchun: nofaol supervizorlarni ham ko'rsatish (tarixiy biriktirishlar) */
  includeInactive?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** "Tanlanmagan" varianti matni (filtrlarda — "Barchasi") */
  noneLabel?: string;
};

function supervisorLabel(s: Supervisor): string {
  const position = s.position ? ` (${s.position})` : "";
  const orgs = (s.organizations ?? []).map((o) => o.name).join(", ");
  return `${s.full_name}${position}${orgs ? ` — ${orgs}` : ""}`;
}

export function SupervisorSearchSelect({
  value,
  onValueChange,
  organizationId,
  includeInactive = false,
  disabled = false,
  placeholder,
  noneLabel,
}: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 250);
  const [picked, setPicked] = useState<Supervisor | null>(null);

  const { data, isFetching } = useSupervisors(
    {
      organization_id: organizationId || undefined,
      include_unassigned: true,
      is_active: includeInactive ? undefined : true,
      search: debouncedSearch || undefined,
    },
    1,
    PAGE_SIZE,
  );
  const supervisors = data?.items ?? [];
  const total = data?.total ?? 0;

  const known =
    (picked && picked.id === value ? picked : undefined) ??
    supervisors.find((s) => s.id === value);
  const single = useSupervisor(value && !known ? value : null);
  const selected = known ?? single.data;
  // Topilmagan (o'chirilgan) supervizor — xom UUID o'rniga tushunarli matn
  const selectedLabel = selected
    ? supervisorLabel(selected)
    : value && single.isError
      ? t("assignmentsSearchSelect.unknownSupervisor")
      : null;

  return (
    <SearchSelect<Supervisor>
      value={value}
      onValueChange={(id, item) => {
        setPicked(item);
        onValueChange(id);
      }}
      items={supervisors}
      getId={(s) => s.id}
      getLabel={supervisorLabel}
      selectedLabel={selectedLabel}
      search={search}
      onSearchChange={setSearch}
      loading={isFetching || search.trim() !== debouncedSearch}
      placeholder={placeholder ?? t("assignmentsAssignmentWizard.supervisorPlaceholder")}
      searchPlaceholder={t("assignmentsSearchSelect.searchSupervisor")}
      emptyText={t("assignmentsSearchSelect.noSupervisorFound")}
      noneLabel={noneLabel ?? t("assignmentsSearchSelect.notSelected")}
      clearable
      disabled={disabled}
      hint={
        total > supervisors.length
          ? t("assignmentsSearchSelect.moreResults", { shown: supervisors.length, total })
          : null
      }
    />
  );
}
