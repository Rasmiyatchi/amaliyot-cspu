import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SearchSelect } from "@/components/admin/assignments/search-select";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api";
import { orgKeys, useOrganizations } from "@/lib/api/organizations";
import type { Organization } from "@/lib/api/types";

const PAGE_SIZE = 50;

type Props = {
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** "Tanlanmagan" varianti matni (filtrlarda — "Barchasi") */
  noneLabel?: string;
  /** Filtrlar uchun: nofaol tashkilotlarni ham ko'rsatish (tarixiy biriktirishlar) */
  includeInactive?: boolean;
};

function organizationLabel(org: Organization): string {
  const location = [org.region, org.district].filter(Boolean).join(", ");
  return location ? `${org.name} (${location})` : org.name;
}

export function OrganizationSearchSelect({
  value,
  onValueChange,
  disabled = false,
  placeholder,
  noneLabel,
  includeInactive = false,
}: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 250);
  const [picked, setPicked] = useState<Organization | null>(null);

  const { data, isFetching } = useOrganizations(
    { is_active: includeInactive ? undefined : true, search: debouncedSearch || undefined },
    1,
    PAGE_SIZE,
  );
  const organizations = data?.items ?? [];
  const total = data?.total ?? 0;

  // Tanlangan tashkilot joriy ro'yxatda bo'lmasa (qidiruv tozalangach) — nomi alohida olinadi
  const known =
    (picked && picked.id === value ? picked : undefined) ??
    organizations.find((o) => o.id === value);
  const single = useQuery({
    queryKey: orgKeys.detail(value),
    queryFn: () => api.get(`v1/organizations/${value}`).json<Organization>(),
    enabled: !!value && !known,
  });
  const selected = known ?? single.data;
  const selectedLabel = selected
    ? organizationLabel(selected)
    : value && single.isError
      ? t("assignmentsSearchSelect.unknownOrganization")
      : null;

  return (
    <SearchSelect<Organization>
      value={value}
      onValueChange={(id, item) => {
        setPicked(item);
        onValueChange(id);
      }}
      items={organizations}
      getId={(o) => o.id}
      getLabel={organizationLabel}
      selectedLabel={selectedLabel}
      search={search}
      onSearchChange={setSearch}
      loading={isFetching || search.trim() !== debouncedSearch}
      placeholder={placeholder ?? t("assignmentsAssignmentWizard.orgPlaceholder")}
      searchPlaceholder={t("assignmentsSearchSelect.searchOrganization")}
      emptyText={t("assignmentsSearchSelect.noOrganizationFound")}
      noneLabel={noneLabel ?? t("assignmentsSearchSelect.notSelected")}
      clearable
      disabled={disabled}
      hint={
        total > organizations.length
          ? t("assignmentsSearchSelect.moreResults", { shown: organizations.length, total })
          : null
      }
    />
  );
}
