import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/admin/academic/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAcademicYears,
  useAllDirections,
  useAllFaculties,
  useAllGroups,
} from "@/lib/api/academic";
import type { StudentFilters } from "@/lib/api/students";
import type { StudentStatus, UUID } from "@/lib/api/types";

type Props = {
  filters: StudentFilters;
  onChange: (f: StudentFilters) => void;
};

const ALL_VALUE = "__all__";

type AssignmentFilter = typeof ALL_VALUE | "assigned" | "unassigned";

const STATUS_OPTIONS: { value: StudentStatus; labelKey: string }[] = [
  { value: "studying", labelKey: "studentsStudentsFilters.statusStudying" },
  { value: "graduated", labelKey: "studentsStudentsFilters.statusGraduated" },
  { value: "academic_leave", labelKey: "studentsStudentsFilters.statusAcademicLeave" },
  { value: "expelled", labelKey: "studentsStudentsFilters.statusExpelled" },
];

export function StudentsFilters({ filters, onChange }: Props) {
  const { t } = useTranslation();
  const faculties = useAllFaculties();
  const directions = useAllDirections(filters.faculty_id);
  const academicYears = useAcademicYears();
  // Guruhlar (yo'nalish tanlanmasa — yuzlab) faqat ro'yxat ochilganda yoki guruh tanlangan bo'lsa yuklanadi
  const [groupsWanted, setGroupsWanted] = useState(false);
  const groupsEnabled = groupsWanted || !!filters.group_id;
  const groups = useAllGroups(
    {
      directionId: filters.direction_id,
      course: filters.course,
      academicYearId: filters.academic_year_id,
    },
    { enabled: groupsEnabled },
  );

  // ─── Qidiruv (debounce) ──────────────────────────────────
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debouncedSearch = useDebounce(searchInput, 350);
  useEffect(() => {
    // Faqat debounce "tinchlanganda" (kiritilgan matn bilan teng) yuboramiz: aks holda
    // "Tozalash"dan keyin eski kechikkan qiymat filtrni qayta tiklab qo'yardi.
    if (debouncedSearch !== searchInput) return;
    const next = debouncedSearch.trim() || undefined;
    if (next !== filters.search) onChange({ ...filters, search: next });
  }, [debouncedSearch, searchInput, filters, onChange]);

  const directionOptions: SearchableOption[] = useMemo(
    () =>
      (directions.data ?? []).map((d) => ({ value: d.id, label: d.name, hint: d.code })),
    [directions.data],
  );
  const groupOptions: SearchableOption[] = useMemo(
    () =>
      (groups.data ?? [])
        .map((g) => ({
          value: g.id,
          label: g.name,
          hint: t("common.courseN", { n: g.course }),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [groups.data, t],
  );

  const hasFilters =
    !!searchInput ||
    !!filters.search ||
    !!filters.faculty_id ||
    !!filters.direction_id ||
    !!filters.group_id ||
    filters.course !== undefined ||
    !!filters.academic_year_id ||
    !!filters.status ||
    filters.has_assignment !== undefined;

  const set = (patch: Partial<StudentFilters>) => onChange({ ...filters, ...patch });
  const clear = () => {
    setSearchInput("");
    onChange({});
  };

  const assignment: AssignmentFilter =
    filters.has_assignment === undefined
      ? ALL_VALUE
      : filters.has_assignment
        ? "assigned"
        : "unassigned";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-full sm:basis-[220px]">
        <Search
          className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder={t("studentsStudentsFilters.searchPlaceholder")}
          aria-label={t("studentsStudentsFilters.searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-8"
        />
      </div>

      <Select
        value={filters.faculty_id ?? ALL_VALUE}
        onValueChange={(v) =>
          // Fakultet almashsa yo'nalish va guruh ham tozalanadi (aks holda ko'rinmas filtr qoladi)
          set({
            faculty_id: v === ALL_VALUE ? undefined : (v as UUID),
            direction_id: undefined,
            group_id: undefined,
          })
        }
      >
        <SelectTrigger className="w-full sm:w-[180px]" aria-label={t("common.faculty")}>
          <SelectValue placeholder={t("common.faculty")} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <SelectItem value={ALL_VALUE}>{t("studentsStudentsFilters.allFaculties")}</SelectItem>
          {(faculties.data ?? []).map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SearchableSelect
        className="w-full sm:w-[220px]"
        aria-label={t("common.direction")}
        value={filters.direction_id ?? null}
        onChange={(v) => set({ direction_id: v ?? undefined, group_id: undefined })}
        options={directionOptions}
        loading={directions.isPending || directions.isFetching}
        placeholder={t("common.direction")}
        clearLabel={t("studentsStudentsFilters.allDirections")}
      />

      <SearchableSelect
        className="w-full sm:w-[180px]"
        aria-label={t("common.group")}
        value={filters.group_id ?? null}
        onChange={(v) => set({ group_id: v ?? undefined })}
        onOpen={() => setGroupsWanted(true)}
        options={groupOptions}
        loading={groupsEnabled && (groups.isPending || groups.isFetching)}
        placeholder={t("common.group")}
        clearLabel={t("studentsStudentsFilters.allGroups")}
      />

      <Select
        value={filters.academic_year_id ?? ALL_VALUE}
        onValueChange={(v) =>
          // Guruhlar ro'yxati o'quv yiliga bog'liq — tanlangan guruh endi mos kelmasligi mumkin
          set({ academic_year_id: v === ALL_VALUE ? undefined : (v as UUID), group_id: undefined })
        }
      >
        <SelectTrigger className="w-full sm:w-[150px]" aria-label={t("common.academicYear")}>
          <SelectValue placeholder={t("common.academicYear")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("common.allYears")}</SelectItem>
          {(academicYears.data ?? []).map((y) => (
            <SelectItem key={y.id} value={y.id}>
              {y.name}
              {y.is_active ? t("common.activeSuffix") : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.course !== undefined ? String(filters.course) : ALL_VALUE}
        onValueChange={(v) =>
          set({ course: v === ALL_VALUE ? undefined : Number(v), group_id: undefined })
        }
      >
        <SelectTrigger className="w-full sm:w-[120px]" aria-label={t("common.course")}>
          <SelectValue placeholder={t("common.course")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("studentsStudentsFilters.allCourses")}</SelectItem>
          {[1, 2, 3, 4, 5].map((c) => (
            <SelectItem key={c} value={String(c)}>
              {t("common.courseN", { n: c })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status ?? ALL_VALUE}
        onValueChange={(v) =>
          set({ status: v === ALL_VALUE ? undefined : (v as StudentStatus) })
        }
      >
        <SelectTrigger className="w-full sm:w-[160px]" aria-label={t("common.status")}>
          <SelectValue placeholder={t("common.status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("studentsStudentsFilters.allStatuses")}</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {t(s.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={assignment}
        onValueChange={(v) =>
          set({
            has_assignment: v === ALL_VALUE ? undefined : v === "assigned",
          })
        }
      >
        <SelectTrigger
          className="w-full sm:w-[170px]"
          aria-label={t("studentsStudentsFilters.assignmentLabel")}
        >
          <SelectValue placeholder={t("studentsStudentsFilters.assignmentLabel")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("studentsStudentsFilters.assignmentAll")}</SelectItem>
          <SelectItem
            value="unassigned"
            className="font-medium text-amber-600 dark:text-amber-400"
          >
            {t("studentsStudentsFilters.assignmentUnassigned")}
          </SelectItem>
          <SelectItem value="assigned" className="text-emerald-600 dark:text-emerald-400">
            {t("studentsStudentsFilters.assignmentAssigned")}
          </SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <X className="h-4 w-4" />
          {t("common.clear")}
        </Button>
      )}
    </div>
  );
}
