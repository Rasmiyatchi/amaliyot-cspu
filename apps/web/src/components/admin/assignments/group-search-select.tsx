import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SearchSelect } from "@/components/admin/assignments/search-select";
import { matchesSearch } from "@/components/admin/assignments/search-select-utils";
import { useAllGroups } from "@/lib/api/academic";
import type { Group, UUID } from "@/lib/api/types";

/** Ro'yxatda bir vaqtda ko'rsatiladigan maksimal variantlar (qolgani — qidiruv orqali) */
const MAX_VISIBLE = 100;

type Props = {
  value: string;
  onValueChange: (id: string) => void;
  /** Amaliyot turi ruxsat bergan kurslar */
  allowedCourses?: number[];
  /** Filtr: yo'nalish / kurs (server tomonida) */
  directionId?: UUID;
  course?: number;
  disabled?: boolean;
  placeholder?: string;
  /** Berilsa — "— (…)" varianti va × tugmasi bilan tozalanadigan (filtrlar uchun) */
  noneLabel?: string;
};

export function GroupSearchSelect({
  value,
  onValueChange,
  allowedCourses = [],
  directionId,
  course,
  disabled = false,
  placeholder,
  noneLabel,
}: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const serverCourse = course ?? (allowedCourses.length === 1 ? allowedCourses[0] : undefined);
  // Guruhlar API'si qidiruvni qo'llamaydi — filtrga mos BARCHA guruhlar yuklanadi,
  // qidiruv mijozda (backend bilan bir xil normallashtirish) bajariladi.
  const { data: allGroups = [], isPending } = useAllGroups({ directionId, course: serverCourse });

  const label = (g: Group) => t("adminAssignments.groupWithCourse", { name: g.name, course: g.course });

  const courseFiltered =
    allowedCourses.length > 1
      ? allGroups.filter((g) => allowedCourses.includes(g.course))
      : allGroups;
  const matched = search.trim()
    ? courseFiltered.filter((g) => matchesSearch(`${g.name} ${label(g)}`, search))
    : courseFiltered;
  const visible = matched.slice(0, MAX_VISIBLE);

  const selected = allGroups.find((g) => g.id === value);
  const selectedLabel = selected
    ? label(selected)
    : value && !isPending
      ? t("assignmentsSearchSelect.unknownGroup")
      : null;

  const emptyText =
    allowedCourses.length > 0 && courseFiltered.length === 0
      ? t("assignmentsAssignmentWizard.noCourseGroups", { courses: allowedCourses.join(", ") })
      : t("assignmentsSearchSelect.noGroupFound");

  return (
    <SearchSelect<Group>
      value={value}
      onValueChange={(id) => onValueChange(id)}
      items={visible}
      getId={(g) => g.id}
      getLabel={label}
      selectedLabel={selectedLabel}
      search={search}
      onSearchChange={setSearch}
      loading={isPending}
      placeholder={placeholder ?? t("assignmentsAssignmentWizard.groupPlaceholder")}
      searchPlaceholder={t("assignmentsSearchSelect.searchGroup")}
      emptyText={emptyText}
      noneLabel={noneLabel}
      clearable={!!noneLabel}
      disabled={disabled}
      hint={
        matched.length > visible.length
          ? t("assignmentsSearchSelect.moreResults", {
              shown: visible.length,
              total: matched.length,
            })
          : null
      }
    />
  );
}
