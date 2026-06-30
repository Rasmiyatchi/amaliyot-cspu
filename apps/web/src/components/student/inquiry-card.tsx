import { Loader2, MessageSquare, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InquiryThread } from "@/components/inquiry-thread";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateInquiry, useMyInquiries } from "@/lib/api/inquiries";
import type { UUID } from "@/lib/api/types";

export function StudentInquiryCard() {
  const { data, isPending } = useMyInquiries();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<UUID | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-primary" />
          Adminga murojaat
        </CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Yangi murojaat
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Xato yoki savol bo'lsa adminga murojaat qiling.
          </p>
        )}
        {data?.map((q) => (
          <button
            key={q.id}
            onClick={() => setOpenId(q.id)}
            className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-muted/50"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{q.subject}</div>
              <div className="text-xs text-muted-foreground">
                {q.message_count} ta xabar
              </div>
            </div>
            <Badge variant={q.is_resolved ? "secondary" : "success"}>
              {q.is_resolved ? "Yopilgan" : "Ochiq"}
            </Badge>
          </button>
        ))}
      </CardContent>

      <CreateDialog open={creating} onClose={() => setCreating(false)} />

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Murojaat</DialogTitle>
          </DialogHeader>
          {openId && <InquiryThread inquiryId={openId} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateInquiry();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Mavzu va xabar majburiy");
      return;
    }
    try {
      await create.mutateAsync({ subject: subject.trim(), body: body.trim() });
      toast.success("Murojaat yuborildi");
      setSubject("");
      setBody("");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !create.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yangi murojaat</DialogTitle>
          <DialogDescription>Xato yoki savolingizni yozing.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Mavzu *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Xabar *</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            Bekor
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Yuborish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
