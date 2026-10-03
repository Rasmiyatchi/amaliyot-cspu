import i18n from "@/i18n";
import { downloadFile } from "@/lib/api";
import type { Semester, UUID } from "@/lib/api/types";

export type SupervisorReportFilters = {
  /** Berilmasa — server faol o'quv yilini oladi; "all" — barcha yillar */
  academic_year_id?: UUID | "all";
  semester?: Semester;
};

/**
 * Supervizorning o'z talabalari bo'yicha yakuniy hisoboti (PDF) — ekrandagi
 * o'quv yili / semestr filtri bilan bir xil.
 */
export async function downloadSupervisorReport(
  filters: SupervisorReportFilters = {},
): Promise<void> {
  const p = new URLSearchParams();
  if (filters.academic_year_id) p.set("academic_year_id", filters.academic_year_id);
  if (filters.semester) p.set("semester", filters.semester);
  const qs = p.toString();
  await downloadFile(
    `/api/v1/supervisors/me/report.pdf${qs ? `?${qs}` : ""}`,
    "amaliyot_hisoboti.pdf",
    i18n.t("apiFiles.reportFailed"),
  );
}
