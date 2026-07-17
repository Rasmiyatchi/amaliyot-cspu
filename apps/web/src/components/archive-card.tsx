import { HTTPError } from "ky";
import {
  Archive,
  Download,
  FileText,
  Loader2,
  NotebookPen,
  Package,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadArchive } from "@/lib/api/archive";
import type { UUID } from "@/lib/api/types";

type Props = {
  assignmentId: UUID;
  compact?: boolean;
};

type Variant = "zip" | "cover" | "journal" | "analyses" | "tasks";

const LABELS: Record<Variant, { labelKey: string; icon: typeof Download }> = {
  zip: { labelKey: "archiveCard.variants.zip", icon: Package },
  cover: { labelKey: "archiveCard.variants.cover", icon: FileText },
  journal: { labelKey: "archiveCard.variants.journal", icon: NotebookPen },
  analyses: { labelKey: "archiveCard.variants.analyses", icon: Sparkles },
  tasks: { labelKey: "archiveCard.variants.tasks", icon: FileText },
};

export function ArchiveCard({ assignmentId, compact }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Variant | null>(null);

  const handle = async (variant: Variant) => {
    setBusy(variant);
    try {
      await downloadArchive(assignmentId, variant);
      toast.success(t("archiveCard.downloaded"));
    } catch (e) {
      const msg =
        e instanceof HTTPError ? e.message : e instanceof Error ? e.message : t("common.error");
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const variants: Variant[] = ["zip", "cover", "journal", "analyses", "tasks"];

  if (compact) {
    // Compact: ZIP faqat + dropdown-like button list
    return (
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const Icon = LABELS[v].icon;
          return (
            <Button
              key={v}
              size="sm"
              variant={v === "zip" ? "default" : "outline"}
              onClick={() => handle(v)}
              disabled={busy !== null}
            >
              {busy === v ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {t(LABELS[v].labelKey)}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Archive className="h-4 w-4 text-primary" />
          {t("archiveCard.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {t("archiveCard.description")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handle("zip")} disabled={busy !== null}>
            {busy === "zip" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            {t("archiveCard.downloadZip")}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {(["cover", "journal", "analyses", "tasks"] as Variant[]).map((v) => {
            const Icon = LABELS[v].icon;
            return (
              <Button
                key={v}
                size="sm"
                variant="outline"
                onClick={() => handle(v)}
                disabled={busy !== null}
              >
                {busy === v ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                {t(LABELS[v].labelKey)}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
