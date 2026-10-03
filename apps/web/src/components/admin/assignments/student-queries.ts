import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { studentKeys, type StudentFilters } from "@/lib/api/students";
import type { Paginated, Student, UUID } from "@/lib/api/types";

/** `/students` sahifasi — `useStudents` bilan bir xil kalit va parametrlar (kesh umumiy). */
export function fetchStudentsPage(
  filters: StudentFilters,
  page: number,
  pageSize: number,
): Promise<Paginated<Student>> {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("page_size", String(pageSize));
  if (filters.group_id) qs.set("group_id", filters.group_id);
  if (filters.course !== undefined) qs.set("course", String(filters.course));
  if (filters.status) qs.set("status", filters.status);
  if (filters.search) qs.set("search", filters.search);
  return api.get(`v1/students?${qs}`).json<Paginated<Student>>();
}

const GROUP_PAGE_SIZE = 100; // backend chegarasi; guruhda odatda 20–35 talaba

/** Guruhdagi o'qiyotgan talabalar — guruh tanlanmaguncha so'rov yuborilmaydi. */
export function useGroupStudents(groupId: UUID | null) {
  const filters: StudentFilters = { group_id: groupId ?? undefined, status: "studying" };
  return useQuery({
    queryKey: studentKeys.list(filters, 1, GROUP_PAGE_SIZE),
    queryFn: () => fetchStudentsPage(filters, 1, GROUP_PAGE_SIZE),
    enabled: !!groupId,
  });
}
