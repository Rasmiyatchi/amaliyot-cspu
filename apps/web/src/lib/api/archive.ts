import { useAuthStore } from "@/stores/auth";
import type { UUID } from "@/lib/api/types";

type ArchiveVariant = "zip" | "cover" | "journal" | "analyses" | "tasks";

const PATHS: Record<ArchiveVariant, string> = {
  zip: "archive.zip",
  cover: "archive/cover.pdf",
  journal: "archive/journal.pdf",
  analyses: "archive/analyses.pdf",
  tasks: "archive/tasks.pdf",
};

/** Auth bilan fayl olib, browser'da download triggerlash. */
export async function downloadArchive(
  assignmentId: UUID,
  variant: ArchiveVariant = "zip",
): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) {
    throw new Error("Kirish tokeni yo'q");
  }
  const res = await fetch(
    `/api/v1/assignments/${assignmentId}/${PATHS[variant]}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Yuklab olishda xato (${res.status}): ${text || res.statusText}`);
  }

  // Content-Disposition'dan filename
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const fallback = {
    zip: "yigma-jild.zip",
    cover: "hisobot.pdf",
    journal: "kundalik.pdf",
    analyses: "dars-tahlillari.pdf",
    tasks: "topshiriqlar.pdf",
  }[variant];
  const filename = match?.[1] ?? fallback;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
