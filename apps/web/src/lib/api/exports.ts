import { useAuthStore } from "@/stores/auth";

export type ExportKind = "students" | "attendance" | "assignments" | "final-reports";

export async function downloadExport(
  kind: ExportKind,
  params: Record<string, string | number | undefined> = {},
): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error("Sessiya tugagan");

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const url = `/api/v1/exports/${kind}.csv${qs.toString() ? "?" + qs.toString() : ""}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Eksport bo'lmadi (${res.status})`);
  }

  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? `${kind}.csv`;

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
