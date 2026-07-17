import type { HemisCredentials } from "@/lib/api/types";
import i18n from "@/i18n";
import { useAuthStore } from "@/stores/auth";

/** Blob javobini fayl sifatida saqlaydi (Content-Disposition'dan nom oladi). */
function saveBlob(res: Response, blob: Blob, fallbackName: string): void {
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? fallbackName;
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/** Serverdan namuna import shablonini (.xlsx) yuklab oladi. */
async function downloadTemplate(path: string, fallbackName: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error(i18n.t("common.sessionExpired"));

  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Shablonni yuklab bo'lmadi (${res.status})`);
  }
  saveBlob(res, await res.blob(), fallbackName);
}

/** Import qilingan talabalar login/parolini to'liq ma'lumot bilan Excel'ga yuklab oladi. */
export async function downloadStudentsCredentials(
  credentials: HemisCredentials[],
): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error(i18n.t("common.sessionExpired"));

  const res = await fetch("/api/v1/hemis/credentials.xlsx", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credentials }),
  });
  if (!res.ok) {
    throw new Error(`Excel yuklab bo'lmadi (${res.status})`);
  }
  saveBlob(res, await res.blob(), "talabalar_login_parol.xlsx");
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
