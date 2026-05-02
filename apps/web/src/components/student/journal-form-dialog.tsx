import { HTTPError } from "ky";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AttachmentsSection } from "@/components/attachments-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateJournal, useUpdateJournal } from "@/lib/api/tasks";
import type { JournalEntry, UUID } from "@/lib/api/types";

type Props = {
  open: boolean;
  assignmentId: UUID;
  entry: JournalEntry | null;
  onClose: () => void;
};

function defaultDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function JournalFormDialog({ open, assignmentId, entry, onClose }: Props) {
  const [date, setDate] = useState<string>(defaultDate());
  const [content, setContent] = useState("");
  const create = useCreateJournal();
  const update = useUpdateJournal();

  const isEdit = !!entry;
  const isApproved = entry?.status === "approved";

  useEffect(() => {
    if (open) {
      if (entry) {
        setDate(entry.date.slice(0, 10));
        setContent(entry.content_md);
      } else {
        setDate(defaultDate());
        setContent("");
      }
    }
  }, [open, entry]);

  const handleSave = async () => {
    if (content.trim().length < 3) {
      toast.error("Matn juda qisqa");
      return;
    }
    try {
      if (isEdit && entry) {
        await update.mutateAsync({
          id: entry.id,
          data: { content_md: content.trim() },
        });
        toast.success("Yangilandi");
      } else {
        await create.mutateAsync({
          assignmentId,
          data: {
            date: new Date(date + "T12:00:00Z").toISOString(),
            content_md: content.trim(),
          },
        });
        toast.success("Yuborildi");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Kundalikni tahrirlash" : "Yangi kundalik"}</DialogTitle>
          <DialogDescription>
            Bugungi amaliyot kuni nima qildingiz?
          </DialogDescription>
        </DialogHeader>

        {entry?.status === "rejected" && entry.rejection_reason && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="font-medium">Rad etilgan</div>
              <div className="mt-1 text-sm">{entry.rejection_reason}</div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="journal-date">Sana</Label>
            <Input
              id="journal-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isEdit || isApproved}
            />
          </div>
          <div>
            <Label htmlFor="journal-content">Matn</Label>
            <textarea
              id="journal-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isApproved}
              rows={10}
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm disabled:opacity-60"
              placeholder="Masalan: Bugun 7-B sinfida biologiya darsida ishtirok etdim. Karimova Oygul darsi yuzasidan tahlil o'tkazdim..."
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {content.length} belgi
            </div>
          </div>
        </div>

        {isEdit && entry && (
          <AttachmentsSection
            kind="journal"
            entityId={entry.id}
            attachments={(entry.attachments ?? []) as never}
            canEdit={!isApproved}
          />
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Yopish
          </Button>
          {!isApproved && (
            <Button onClick={handleSave} disabled={busy || content.trim().length < 3}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              {isEdit ? "Saqlash" : "Yuborish"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
