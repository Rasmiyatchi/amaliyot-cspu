import { Loader2, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InquiryThread } from "@/components/inquiry-thread";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useInquiries,
  useResolveInquiry,
  type Inquiry,
} from "@/lib/api/inquiries";

const TABS = [
  { value: "open", label: "Ochiq" },
  { value: "resolved", label: "Yopilgan" },
  { value: "all", label: "Barchasi" },
];

export function InquiriesPage() {
  const [tab, setTab] = useState("open");
  const resolved = tab === "all" ? undefined : tab === "resolved";
  const { data, isPending, error } = useInquiries(resolved);
  const resolveMut = useResolveInquiry();
  const [selected, setSelected] = useState<Inquiry | null>(null);

  const toggleResolved = async (q: Inquiry) => {
    try {
      await resolveMut.mutateAsync({ id: q.id, resolved: !q.is_resolved });
      toast.success(q.is_resolved ? "Qayta ochildi" : "Yopildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Talaba murojaatlari</h1>
          <p className="text-sm text-muted-foreground">
            Talabalarning xato/savol murojaatlariga javob bering
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isPending && (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && data.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={MessageSquare}
            title="Murojaat yo'q"
            description="Tanlangan holat bo'yicha murojaat topilmadi"
          />
        </div>
      )}

      {data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => setSelected(q)}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{q.subject}</span>
                  <Badge variant={q.is_resolved ? "secondary" : "success"}>
                    {q.is_resolved ? "Yopilgan" : "Ochiq"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {q.student_name ?? "—"} · {q.message_count} ta xabar ·{" "}
                  {new Date(q.updated_at).toLocaleDateString("uz-UZ")}
                </div>
              </button>
              <Button
                variant="outline"
                size="sm"
                disabled={resolveMut.isPending}
                onClick={() => toggleResolved(q)}
              >
                {q.is_resolved ? "Qayta ochish" : "Yopish"}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected?.subject}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {selected?.student_name}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selected && <InquiryThread inquiryId={selected.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
