import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SearchSelect } from "@/components/admin/assignments/search-select";
import { fetchStudentsPage } from "@/components/admin/assignments/student-queries";
import { useDebounce } from "@/hooks/use-debounce";
import { studentKeys, useStudent, type StudentFilters } from "@/lib/api/students";
import type { Paginated, Student } from "@/lib/api/types";

const PAGE_SIZE = 50;

type Props = {
  value: string;
  onValueChange: (id: string) => void;
  /** Amaliyot turi ruxsat bergan kurslar — server tomonida har kurs alohida so'raladi */
  allowedCourses?: number[];
  disabled?: boolean;
  placeholder?: string;
};

/** Kurslar bo'yicha natijalarni bitta ro'yxatga yig'ish (barqaror funksiya — natija memoizatsiya qilinadi) */
function combineStudents(results: UseQueryResult<Paginated<Student>>[]) {
  return {
    // Server qidiruvi natijasi qayta filtrlanmaydi (tutuq belgilarini server normallashtiradi)
    students: results
      .flatMap((r) => r.data?.items ?? [])
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    total: results.reduce((sum, r) => sum + (r.data?.total ?? 0), 0),
    fetching: results.some((r) => r.isFetching),
  };
}

export function StudentSearchSelect({
  value,
  onValueChange,
  allowedCourses = [],
  disabled = false,
  placeholder,
}: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 250);
  const [picked, setPicked] = useState<Student | null>(null);

  // Ko'p kursli turlarda (4+2: 2–4-kurs) har kurs alohida so'raladi — aks holda birinchi
  // 100 ta (barcha kurslardan) olinib, ko'pi mijozda tashlab yuborilardi.
  const courses = allowedCourses.length > 0 ? allowedCourses : [undefined];
  const { students, total, fetching } = useQueries({
    queries: courses.map((course) => {
      const filters: StudentFilters = {
        course,
        status: "studying",
        search: debouncedSearch || undefined,
      };
      return {
        queryKey: studentKeys.list(filters, 1, PAGE_SIZE),
        queryFn: () => fetchStudentsPage(filters, 1, PAGE_SIZE),
        placeholderData: (prev: Paginated<Student> | undefined) => prev,
      };
    }),
    combine: combineStudents,
  });
  const loading = fetching || search.trim() !== debouncedSearch;

  const label = (s: Student) =>
    `${s.full_name} — ${s.hemis_id} — ${s.group_name ?? t("assignmentsSearchSelect.noGroup")}`;

  const known =
    (picked && picked.id === value ? picked : undefined) ?? students.find((s) => s.id === value);
  const single = useStudent(value && !known ? value : null);
  const selected = known ?? single.data;
  const selectedLabel = selected
    ? label(selected)
    : value && single.isError
      ? t("assignmentsSearchSelect.unknownStudent")
      : null;

  return (
    <SearchSelect<Student>
      value={value}
      onValueChange={(id, item) => {
        setPicked(item);
        onValueChange(id);
      }}
      items={students}
      getId={(s) => s.id}
      getLabel={label}
      selectedLabel={selectedLabel}
      search={search}
      onSearchChange={setSearch}
      loading={loading}
      placeholder={placeholder ?? t("assignmentsAssignmentWizard.studentPlaceholder")}
      searchPlaceholder={t("assignmentsSearchSelect.searchStudent")}
      emptyText={t("assignmentsSearchSelect.noStudentFound")}
      disabled={disabled}
      hint={
        total > students.length
          ? t("assignmentsSearchSelect.moreResults", { shown: students.length, total })
          : null
      }
    />
  );
}
