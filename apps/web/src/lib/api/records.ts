import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { UUID } from "@/lib/api/types";

export type RecordRow = {
  assignment_id: UUID;
  student_name: string;
  direction_name: string | null;
  direction_code: string | null;
  group_name: string | null;
  course: number | null;
  education_form: string | null;
  practice_type_name: string;
  object_name: string | null;
  supervisor_name: string | null;
  start_date: string;
  end_date: string;
  attendance_pct: number | null;
  korxona_grade: number | null;
  korxona_grade_max: number | null;
  qaydnoma_grade: number | null;
  credit_earned: boolean | null;
};

export type RecordFilters = {
  academic_year_id?: UUID;
  direction_id?: UUID;
  course?: number;
  group_id?: UUID;
  supervisor_id?: UUID;
  education_form?: string;
  degree_type?: string;
  start_from?: string;
  end_to?: string;
  search?: string;
};

export function recordsQs(filters: RecordFilters): string {
  const p = new URLSearchParams();
  if (filters.academic_year_id) p.set("academic_year_id", filters.academic_year_id);
  if (filters.direction_id) p.set("direction_id", filters.direction_id);
  if (filters.course !== undefined) p.set("course", String(filters.course));
  if (filters.group_id) p.set("group_id", filters.group_id);
  if (filters.supervisor_id) p.set("supervisor_id", filters.supervisor_id);
  if (filters.education_form) p.set("education_form", filters.education_form);
  if (filters.degree_type) p.set("degree_type", filters.degree_type);
  if (filters.start_from) p.set("start_from", filters.start_from);
  if (filters.end_to) p.set("end_to", filters.end_to);
  if (filters.search) p.set("search", filters.search);
  return p.toString();
}

export function useRecords(filters: RecordFilters = {}) {
  return useQuery({
    queryKey: ["records", filters],
    queryFn: () => api.get(`v1/records?${recordsQs(filters)}`).json<RecordRow[]>(),
    placeholderData: (prev) => prev,
  });
}

async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error("Sessiya tugagan");
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Yuklab bo'lmadi (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadRecordsXlsx(filters: RecordFilters): Promise<void> {
  return downloadFile(`/api/v1/records/export.xlsx?${recordsQs(filters)}`, "qaydnomalar.xlsx");
}

export function downloadRecordsPdf(filters: RecordFilters): Promise<void> {
  return downloadFile(
    `/api/v1/records/baholash-qaydnomasi.pdf?${recordsQs(filters)}`,
    "baholash_qaydnomasi.pdf",
  );
}
