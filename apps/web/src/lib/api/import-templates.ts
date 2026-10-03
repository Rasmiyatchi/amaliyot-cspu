import i18n from "@/i18n";
import {
  authFetch,
  downloadFile,
  filenameFromDisposition,
  readErrorDetail,
  saveBlob,
} from "@/lib/api";
import type { HemisCredentials } from "@/lib/api/types";

/** Serverdan namuna import shablonini (.xlsx) yuklab oladi (token + 401→refresh bilan). */
function downloadTemplate(path: string, fallbackName: string): Promise<void> {
  return downloadFile(path, fallbackName, i18n.t("apiFiles.templateFailed"));
}

/** Import qilingan talabalar login/parolini to'liq ma'lumot bilan Excel'ga yuklab oladi. */
export async function downloadStudentsCredentials(
  credentials: HemisCredentials[],
): Promise<void> {
  const res = await authFetch("/api/v1/hemis/credentials.xlsx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentials }),
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res, i18n.t("apiFiles.credentialsFailed")));
  }
  const filename = filenameFromDisposition(
    res.headers.get("content-disposition"),
    "talabalar_login_parol.xlsx",
  );
  saveBlob(await res.blob(), filename);
}

export function downloadStudentsTemplate(): Promise<void> {
  return downloadTemplate("/api/v1/hemis/template", "talabalar_import_shablon.xlsx");
}

export function downloadSupervisorsTemplate(): Promise<void> {
  return downloadTemplate(
    "/api/v1/supervisors/import-template",
    "oqituvchilar_import_shablon.xlsx",
  );
}
