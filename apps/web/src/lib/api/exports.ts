import i18n from "@/i18n";
import { downloadFile } from "@/lib/api";

export type ExportKind = "students" | "attendance" | "assignments" | "final-reports";

type ExportParams = Record<string, string | number | undefined>;

function exportUrl(file: string, params: ExportParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString();
  return `/api/v1/exports/${file}${query ? `?${query}` : ""}`;
}

/** Token + 401→refresh bilan yuklab olish; xatoda server `detail`i ko'rsatiladi. */
function downloadExportFile(file: string, params: ExportParams, fallbackName: string): Promise<void> {
  return downloadFile(exportUrl(file, params), fallbackName, i18n.t("apiFiles.exportFailed"));
}

/** Talabalar login/parol jadvali (Excel) — students bilan bir xil filtrlar. */
export function downloadCredentialsExport(params: ExportParams = {}): Promise<void> {
  return downloadExportFile("credentials.xlsx", params, "login_parol.xlsx");
}

export function downloadExport(kind: ExportKind, params: ExportParams = {}): Promise<void> {
  return downloadExportFile(`${kind}.csv`, params, `${kind}.csv`);
}

export function downloadOrganizationsExport(params: ExportParams = {}): Promise<void> {
  return downloadExportFile("organizations.xlsx", params, "tashkilotlar.xlsx");
}

export function downloadAreasExport(params: ExportParams = {}): Promise<void> {
  return downloadExportFile("areas.xlsx", params, "hududlar.xlsx");
}
