import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SearchSelect } from "@/components/admin/assignments/search-select";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api";
import { areaKeys, useAreas } from "@/lib/api/areas";
import type { Area } from "@/lib/api/types";

const PAGE_SIZE = 50;

type Props = {
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

function areaLabel(area: Area): string {
  const location = [area.region, area.district].filter(Boolean).join(", ");
  return location ? `${area.name} (${location})` : area.name;
}

export function AreaSearchSelect({ value, onValueChange, disabled = false, placeholder }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 250);
  const [picked, setPicked] = useState<Area | null>(null);

  const { data, isFetching } = useAreas(
    { is_active: true, search: debouncedSearch || undefined },
    1,
    PAGE_SIZE,
  );
  const areas = data?.items ?? [];
  const total = data?.total ?? 0;

  // Tanlangan hudud joriy ro'yxatda bo'lmasa (qidiruv tozalangach) — nomi alohida olinadi
  const known =
    (picked && picked.id === value ? picked : undefined) ?? areas.find((a) => a.id === value);
  const single = useQuery({
    queryKey: [...areaKeys.all, "detail", value] as const,
    queryFn: () => api.get(`v1/areas/${value}`).json<Area>(),
    enabled: !!value && !known,
  });
  const selected = known ?? single.data;
  const selectedLabel = selected
    ? areaLabel(selected)
    : value && single.isError
      ? t("assignmentsSearchSelect.unknownArea")
      : null;

  return (
    <SearchSelect<Area>
      value={value}
      onValueChange={(id, item) => {
        setPicked(item);
        onValueChange(id);
      }}
      items={areas}
      getId={(a) => a.id}
      getLabel={areaLabel}
      selectedLabel={selectedLabel}
      search={search}
      onSearchChange={setSearch}
      loading={isFetching || search.trim() !== debouncedSearch}
      placeholder={placeholder ?? t("assignmentsAssignmentWizard.areaPlaceholder")}
      searchPlaceholder={t("assignmentsSearchSelect.searchArea")}
      emptyText={t("assignmentsSearchSelect.noAreaFound")}
      noneLabel={t("assignmentsSearchSelect.notSelected")}
      clearable
      disabled={disabled}
      hint={
        total > areas.length
          ? t("assignmentsSearchSelect.moreResults", { shown: areas.length, total })
          : null
      }
    />
  );
}
