import { Check, ClipboardEdit, Download, Layers, Loader2, X, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  downloadContract,
  downloadApplicationScan,
  useAppendix,
  useApplications,
  useApproveApplication,
  useRejectApplication,
  useReturnApplication,
  type ApplicationStatus,
  type PracticeApplication,
} from "@/lib/api/applications";
import { useAuthStore } from "@/stores/auth";

const ALL = "__all__";
const STATUS_TABS: { value: string; labelKey: string }[] = [
  { value: ALL, labelKey: "Barchasi" },
  { value: "submitted", labelKey: "Yangi" },
  { value: "approved", labelKey: "Tasdiqlangan" },
  { value: "revision_required", labelKey: "Tuzatish kerak" },
  { value: "rejected", labelKey: "Rad etilgan" },
];
const STATUS_BADGE: Record<ApplicationStatus, { labelKey: string; variant: "secondary" | "success" | "destructive" | "warning" }> = {
  submitted: { labelKey: "Yangi", variant: "secondary" },
  approved: { labelKey: "Tasdiqlangan", variant: "success" },
  revision_required: { labelKey: "Tuzatish kerak", variant: "warning" },
  rejected: { labelKey: "Rad etilgan", variant: "destructive" },
};

export function ApplicationsPage() {
  const { t } = useTranslation();
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "super_admin");
  const [tab, setTab] = useState(ALL);
  const [view, setView] = useState<"list" | "appendix">("list");
  const status = tab === ALL ? undefined : (tab as ApplicationStatus);
  const { data, isPending, error } = useApplications({ status });
  const appendix = useAppendix();
  const approve = useApproveApplication();
  const reject = useRejectApplication();
  const returnApp = useReturnApplication();
  
  const [returnDialog, setReturnDialog] = useState<{ open: boolean, app: PracticeApplication | null }>({ open: false, app: null });
  const [returnReason, setReturnReason] = useState("");

  const handleApprove = async (a: PracticeApplication) => {
    try {
      await approve.mutateAsync(a.id);
      toast.success(t("adminApplications.toastApproved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const handleReject = async (a: PracticeApplication) => {
    const note = prompt(t("adminApplications.rejectReasonPrompt")) ?? undefined;
    try {
      await reject.mutateAsync({ id: a.id, review_note: note || undefined });
      toast.success(t("adminApplications.toastRejected"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };
  
  const handleReturn = async () => {
    if (!returnReason.trim() || !returnDialog.app) {
        toast.error("Iltimos, qaytarish sababini kiriting");
        return;
    }
    try {
        await returnApp.mutateAsync({ id: returnDialog.app.id, return_reason: returnReason.trim() });
        toast.success("Ariza talabaga qaytarildi");
        setReturnDialog({ open: false, app: null });
        setReturnReason("");
    } catch (e) {
        toast.error(e instanceof Error ? e.message : t("common.error"));
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
            <h1 className="text-2xl font-semibold">{t("adminApplications.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("adminApplications.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
          >
            {t("adminApplications.viewList")}
          </Button>
          <Button
            variant={view === "appendix" ? "default" : "outline"}
            onClick={() => setView("appendix")}
          >
            <Layers className="h-4 w-4" />
            {t("adminApplications.viewAppendix")}
          </Button>
        </div>
      </div>

      {view === "list" && (
        <>
          <Tabs value={tab} onValueChange={setTab} className="mb-4">
            <TabsList className="flex-wrap">
              {STATUS_TABS.map((tabItem) => (
                <TabsTrigger key={tabItem.value} value={tabItem.value}>
                  {t(tabItem.labelKey)}
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
                    <TableHead>{t("common.student")}</TableHead>
                    <TableHead>{t("adminApplications.colDirectionCourse")}</TableHead>
                    <TableHead>Tashkilot</TableHead>
                    <TableHead>{t("common.area")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    {isSuperAdmin && <TableHead className="w-[150px]">{t("adminApplications.colAction")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 6 : 5} className="p-0">
                        <EmptyState
                          icon={ClipboardEdit}
                          title={t("adminApplications.emptyTitle")}
                          description={t("adminApplications.emptyDescription")}
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
                        {a.course ? ` · ${t("common.courseN", { n: a.course })}` : ""}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{a.organization_name}</div>
                        <div className="text-xs text-muted-foreground">{a.organization_type}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.region ?? "—"}
                        {a.district ? `, ${a.district}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[a.status].variant}>
                          {t(STATUS_BADGE[a.status].labelKey)}
                        </Badge>
                        {a.status === "revision_required" && a.return_reason && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Sabab: {a.return_reason}
                          </div>
                        )}
                        {a.contract_number && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {a.contract_number}
                            </span>
                            {a.has_contract_file && (
                              <button
                                title={t("adminApplications.contractDocx")}
                                className="text-primary hover:underline"
                                onClick={() =>
                                  downloadContract(a.id, a.contract_number).catch((e) =>
                                    toast.error(e instanceof Error ? e.message : t("common.error")),
                                  )
                                }
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {a.has_scan_file && (
                              <button
                                title="Skan qilingan nusxa"
                                className="text-primary hover:underline ml-1"
                                onClick={() =>
                                  downloadApplicationScan(a.id).catch((e) =>
                                    toast.error(e instanceof Error ? e.message : t("common.error")),
                                  )
                                }
                              >
                                <span className="text-[10px] font-medium border rounded px-1 ml-1 bg-primary/10">SKAN</span>
                              </button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          {(a.status === "submitted" || a.status === "revision_required") && (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-success"
                                title={t("adminApplications.approveWithQr")}
                                disabled={approve.isPending}
                                onClick={() => handleApprove(a)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-warning"
                                title="Kamchilik sababli qaytarish"
                                onClick={() => setReturnDialog({ open: true, app: a })}
                              >
                                <AlertCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                title={t("common.reject")}
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
                title={t("adminApplications.appendixEmptyTitle")}
                description={t("adminApplications.appendixEmptyDescription")}
              />
            </div>
          )}
          {appendix.data?.map((g) => (
            <div key={g.region} className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
                <span className="font-medium">{g.region}</span>
                <Badge variant="outline">{t("adminApplications.studentsCount", { count: g.count })}</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">№</TableHead>
                    <TableHead>{t("common.student")}</TableHead>
                    <TableHead>{t("common.direction")}</TableHead>
                    <TableHead className="w-[80px]">{t("common.course")}</TableHead>
                    <TableHead>Tashkilot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.students.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.student_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.direction_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.course ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.organization_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
      
      {/* Return Dialog */}
      <Dialog open={returnDialog.open} onOpenChange={(o) => !o && setReturnDialog({ open: false, app: null })}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Arizani tuzatishga qaytarish</DialogTitle>
                <DialogDescription>
                    Talabaga nima uchun arizasi qaytarilayotgani va nimani to'g'irlashi kerakligini yozing.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Input 
                    value={returnReason} 
                    onChange={e => setReturnReason(e.target.value)} 
                    placeholder="Masalan: Tashkilot nomi noto'g'ri kiritilgan..." 
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setReturnDialog({ open: false, app: null })}>Bekor qilish</Button>
                <Button onClick={handleReturn} disabled={returnApp.isPending}>
                    {returnApp.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Qaytarish
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
