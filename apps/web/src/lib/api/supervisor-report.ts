import { useAuthStore } from "@/stores/auth";
import i18n from "@/i18n";

/** Supervizorning o'z talabalari bo'yicha yakuniy hisobotini PDF sifatida yuklab oladi. */
export async function downloadSupervisorReport(): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error(i18n.t("common.sessionExpired"));

  const res = await fetch("/api/v1/supervisors/me/report.pdf", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Hisobot yuklab bo'lmadi (${res.status})`);
  }

  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? "amaliyot_hisoboti.pdf";

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
