import i18n from "@/i18n";
import { downloadFile } from "@/lib/api";
import type { UUID } from "@/lib/api/types";

type ArchiveVariant = "zip" | "cover" | "journal" | "analyses" | "tasks";

const PATHS: Record<ArchiveVariant, string> = {
  zip: "archive.zip",
  cover: "archive/cover.pdf",
  journal: "archive/journal.pdf",
  analyses: "archive/analyses.pdf",
  tasks: "archive/tasks.pdf",
};

const FALLBACK_NAMES: Record<ArchiveVariant, string> = {
  zip: "yigma-jild.zip",
  cover: "hisobot.pdf",
  journal: "kundalik.pdf",
  analyses: "dars-tahlillari.pdf",
  tasks: "topshiriqlar.pdf",
};

/** Yig'ma jild (ZIP) yoki uning alohida PDF qismlarini yuklab olish (token + 401→refresh). */
export function downloadArchive(assignmentId: UUID, variant: ArchiveVariant = "zip"): Promise<void> {
  return downloadFile(
    `/api/v1/assignments/${assignmentId}/${PATHS[variant]}`,
    FALLBACK_NAMES[variant],
    i18n.t("apiFiles.archiveFailed"),
  );
}
