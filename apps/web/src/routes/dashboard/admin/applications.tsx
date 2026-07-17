import { Check, ClipboardEdit, Download, Layers, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  downloadContract,
  useAppendix,
  useApplications,
  useApproveApplication,
  useRejectApplication,
  type ApplicationStatus,
  type PracticeApplication,
} from "@/lib/api/applications";
import { useAuthStore } from "@/stores/auth";

const ALL = "__all__";
const STATUS_TABS: { value: string; label: string }[] = [
  { value: ALL, label: "Barchasi" },
  { value: "pending", label: "Kutilmoqda" },
  { value: "approved", label: "Tasdiqlangan" },
  { value: "rejected", label: "Rad etilgan" },
];
const STATUS_BADGE: Record<ApplicationStatus, { label: string; variant: "secondary" | "success" | "destructive" }> = {
  pending: { label: "Kutilmoqda", variant: "secondary" },
  approved: { label: "Tasdiqlangan", variant: "success" },
  rejected: { label: "Rad etilgan", variant: "destructive" },
};

export function ApplicationsPage() {
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "super_admin");
  const [tab, setTab] = useState(ALL);
  const [view, setView] = useState<"list" | "appendix">("list");
  const status = tab === ALL ? undefined : (tab as ApplicationStatus);
  const { data, isPending, error } = useApplications({ status });
  const appendix = useAppendix();
  const approve = useApproveApplication();
  const reject = useRejectApplication();

  const handleApprove = async (a: PracticeApplication) => {
    try {
      await approve.mutateAsync(a.id);
      toast.success("Ariza QR bilan tasdiqlandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const handleReject = async (a: PracticeApplication) => {
    const note = prompt("Rad etish sababi (ixtiyoriy):") ?? undefined;
    try {
      await reject.mutateAsync({ id: a.id, review_note: note || undefined });
      toast.success("Ariza rad etildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardEdit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Amaliyot arizalari</h1>
            <p className="text-sm text-muted-foreground">
              Talabalar yuborgan arizalarni ko'rib chiqing va QR bilan tasdiqlang
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
          >
            Arizalar
          </Button>
          <Button
            variant={view === "appendix" ? "default" : "outline"}
            onClick={() => setView("appendix")}
          >
            <Layers className="h-4 w-4" />
            Ilova (hudud)
          </Button>
        </div>
      </div>

      {view === "list" && (
        <>
          <Tabs value={tab} onValueChange={setTab} className="mb-4">
            <TabsList className="flex-wrap">
              {STATUS_TABS.map((t) => (
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

          {data && (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Talaba</TableHead>
                    <TableHead>Mutaxassislik / Kurs</TableHead>
                    <TableHead>Obyekt</TableHead>
                    <TableHead>Hudud</TableHead>
                    <TableHead>Rahbar tel.</TableHead>
                    <TableHead>Holat</TableHead>
                    {isSuperAdmin && <TableHead className="w-[120px]">Amal</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 7 : 6} className="p-0">
                        <EmptyState
                          icon={ClipboardEdit}
                          title="Ariza yo'q"
                          description="Tanlangan holat bo'yicha ariza topilmadi"
                          compact
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {data.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.student_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {a.direction_name ?? "—"}
                        {a.course ? ` · ${a.course}-kurs` : ""}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{a.object_name}</div>
                        <div className="text-xs text-muted-foreground">{a.object_location}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.region ?? "—"}
                        {a.district ? `, ${a.district}` : ""}
                      </TableCell>
                      <TableCell className="text-sm">{a.manager_phone}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[a.status].variant}>
                          {STATUS_BADGE[a.status].label}
                        </Badge>
                        {a.contract_number && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {a.contract_number}
                            </span>
                            {a.has_contract_file && (
                              <button
                                title="Shartnoma (DOCX)"
                                className="text-primary hover:underline"
                                onClick={() =>
                                  downloadContract(a.id, a.contract_number).catch((e) =>
                                    toast.error(e instanceof Error ? e.message : "Xatolik"),
                                  )
                                }
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          {a.status === "pending" && (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-success"
                                title="QR bilan tasdiqlash"
                                disabled={approve.isPending}
                                onClick={() => handleApprove(a)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                title="Rad etish"
                                disabled={reject.isPending}
                                onClick={() => handleReject(a)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {view === "appendix" && (
        <div className="space-y-4">
          {appendix.isPending && (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {appendix.data && appendix.data.length === 0 && (
            <div className="rounded-lg border border-border">
              <EmptyState
                icon={Layers}
                title="Ilova yo'q"
                description="Bir hududga 2+ tasdiqlangan talaba bo'lganda ilova shakllanadi"
              />
            </div>
          )}
          {appendix.data?.map((g) => (
            <div key={g.region} className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
                <span className="font-medium">{g.region}</span>
                <Badge variant="outline">{g.count} ta talaba</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">№</TableHead>
                    <TableHead>Talaba</TableHead>
                    <TableHead>Yo'nalish</TableHead>
                    <TableHead className="w-[80px]">Kurs</TableHead>
                    <TableHead>Obyekt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.students.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.student_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.direction_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.course ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.object_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
