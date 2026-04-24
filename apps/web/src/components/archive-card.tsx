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

const LABELS: Record<Variant, { label: string; icon: typeof Download }> = {
  zip: { label: "Yig'ma jild (ZIP)", icon: Package },
  cover: { label: "Umumiy hisobot", icon: FileText },
  journal: { label: "Kundalik", icon: NotebookPen },
  analyses: { label: "Dars tahlillari", icon: Sparkles },
  tasks: { label: "Topshiriqlar", icon: FileText },
};

export function ArchiveCard({ assignmentId, compact }: Props) {
  const [busy, setBusy] = useState<Variant | null>(null);

  const handle = async (variant: Variant) => {
    setBusy(variant);
    try {
      await downloadArchive(assignmentId, variant);
      toast.success("Yuklab olindi");
    } catch (e) {
      const msg = e instanceof HTTPError ? e.message : e instanceof Error ? e.message : "Xatolik";
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
              {LABELS[v].label}
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
          Yig'ma jild
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Amaliyot natijalari: umumiy hisobot, kundalik, dars tahlillari va topshiriqlar.
          Shartnoma (agar bo'lsa) ZIP'ga avtomatik qo'shiladi.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handle("zip")} disabled={busy !== null}>
            {busy === "zip" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            Yig'ma jildni yuklab olish
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
                {LABELS[v].label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
