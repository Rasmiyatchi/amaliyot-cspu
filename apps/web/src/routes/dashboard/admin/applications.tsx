import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Check,
  ClipboardEdit,
  Download,
  Eye,
  FileCheck,
  Layers,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  previewContractPdf,
  useAppendix,
  useApplications,
  useApproveApplication,
  useArchiveApplication,
  useConfirmScan,
  useRejectApplication,
  useReturnApplication,
  useTemplateFormFields,
  useUnarchiveApplication,
  type ApplicationStatus,
  type PracticeApplication,
} from "@/lib/api/applications";
import { useAuthStore } from "@/stores/auth";

const ALL = "__all__";
const STATUS_TABS: { value: string; labelKey: string }[] = [
  { value: ALL, labelKey: "common.all" },
  { value: "submitted", labelKey: "adminApplications.status.new" },
  { value: "resubmitted", labelKey: "adminApplications.status.resubmitted" },
  { value: "approved", labelKey: "adminApplications.status.approved" },
  { value: "active", labelKey: "adminApplications.status.active" },
  { value: "revision_required", labelKey: "adminApplications.status.revisionRequired" },
  { value: "rejected", labelKey: "adminApplications.status.rejected" },
  { value: "archived", labelKey: "adminApplications.status.archived" },
];
type BadgeVariant = "secondary" | "success" | "destructive" | "warning" | "default";
const STATUS_BADGE: Record<ApplicationStatus, { labelKey: string; variant: BadgeVariant }> = {
  draft: { labelKey: "adminApplications.status.draft", variant: "default" },
  submitted: { labelKey: "adminApplications.status.new", variant: "secondary" },
  under_review: { labelKey: "adminApplications.status.underReview", variant: "warning" },
  revision_required: { labelKey: "adminApplications.status.revisionRequired", variant: "warning" },
  resubmitted: { labelKey: "adminApplications.status.resubmitted", variant: "secondary" },
  approved: { labelKey: "adminApplications.status.approved", variant: "success" },
  active: { labelKey: "adminApplications.status.active", variant: "success" },
  rejected: { labelKey: "adminApplications.status.rejected", variant: "destructive" },
  expired: { labelKey: "adminApplications.status.expired", variant: "destructive" },
  archived: { labelKey: "adminApplications.status.archived", variant: "default" },
};

/** Superadmin ko'rib chiqishi mumkin bo'lgan statuslar (approve/return/reject). */
const REVIEWABLE: ApplicationStatus[] = ["submitted", "revision_required", "resubmitted"];

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
  const confirmScan = useConfirmScan();
  const archive = useArchiveApplication();
  const unarchive = useUnarchiveApplication();

  const [detailApp, setDetailApp] = useState<PracticeApplication | null>(null);
  const [returnDialog, setReturnDialog] = useState<{ open: boolean, app: PracticeApplication | null }>({ open: false, app: null });
  const [returnReason, setReturnReason] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<{
    action: "archive" | "unarchive";
    app: PracticeApplication;
  } | null>(null);

  const handleApprove = async (a: PracticeApplication) => {
    try {
      await approve.mutateAsync(a.id);
      toast.success(t("adminApplications.toastApproved"));
      setDetailApp(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const handleReject = async (a: PracticeApplication) => {
    const note = prompt(t("adminApplications.rejectReasonPrompt")) ?? undefined;
    try {
      await reject.mutateAsync({ id: a.id, review_note: note || undefined });
      toast.success(t("adminApplications.toastRejected"));
      setDetailApp(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const openReturnDialog = (a: PracticeApplication) => {
    setDetailApp(null);
    setReturnDialog({ open: true, app: a });
  };

  const handleReturn = async () => {
    if (!returnReason.trim() || !returnDialog.app) {
        toast.error(t("adminApplications.returnReasonRequired"));
        return;
    }
    try {
        await returnApp.mutateAsync({ id: returnDialog.app.id, return_reason: returnReason.trim() });
        toast.success(t("adminApplications.toastReturned"));
        setReturnDialog({ open: false, app: null });
        setReturnReason("");
    } catch (e) {
        toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const handleConfirmScan = async (a: PracticeApplication) => {
    if (!confirm(t("adminApplications.confirmScanPrompt"))) return;
    try {
      await confirmScan.mutateAsync(a.id);
      toast.success(t("adminApplications.toastScanConfirmed"));
      setDetailApp(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    const { action, app } = archiveTarget;
    try {
      if (action === "archive") {
        await archive.mutateAsync(app.id);
        toast.success(t("adminContracts.archivedSuccess"));
      } else {
        await unarchive.mutateAsync(app.id);
        toast.success(t("adminContracts.unarchivedSuccess"));
      }
      setArchiveTarget(null);
      setDetailApp(null);
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
                    <TableHead>{t("common.organization")}</TableHead>
                    <TableHead>{t("adminApplications.colStudentResidence")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="w-[150px]">{t("adminApplications.colAction")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
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
                    <TableRow
                      key={a.id}
                      className="cursor-pointer"
                      onClick={() => setDetailApp(a)}
                    >
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
                        <Badge variant={STATUS_BADGE[a.status]?.variant ?? "default"}>
                          {STATUS_BADGE[a.status] ? t(STATUS_BADGE[a.status].labelKey) : a.status}
                        </Badge>
                        {a.status === "revision_required" && a.return_reason && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            {t("adminApplications.reason", { reason: a.return_reason })}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadContract(a.id, a.contract_number).catch((err) =>
                                    toast.error(err instanceof Error ? err.message : t("common.error")),
                                  );
                                }}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {a.has_scan_file && (
                              <button
                                title={t("adminApplications.scanCopy")}
                                className="text-primary hover:underline ml-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadApplicationScan(a.id).catch((err) =>
                                    toast.error(err instanceof Error ? err.message : t("common.error")),
                                  );
                                }}
                              >
                                <span className="text-[10px] font-medium border rounded px-1 ml-1 bg-primary/10">{t("adminApplications.scanBadge")}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title={t("adminApplications.openDetail")}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailApp(a);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isSuperAdmin && REVIEWABLE.includes(a.status) && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-success"
                                title={t("adminApplications.approveWithQr")}
                                disabled={approve.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(a);
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-warning"
                                title={t("adminApplications.returnForRevision")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReturnDialog(a);
                                }}
                              >
                                <AlertCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                title={t("common.reject")}
                                disabled={reject.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(a);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {a.status === "approved" && a.has_scan_file && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-success"
                              title={t("adminApplications.confirmScan")}
                              disabled={confirmScan.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmScan(a);
                              }}
                            >
                              <FileCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {a.status === "archived" || a.status === "expired" ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              title={t("adminContracts.unarchiveButton")}
                              onClick={(e) => {
                                e.stopPropagation();
                                setArchiveTarget({ action: "unarchive", app: a });
                              }}
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title={t("adminContracts.archiveButton")}
                              onClick={(e) => {
                                e.stopPropagation();
                                setArchiveTarget({ action: "archive", app: a });
                              }}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
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
                    <TableHead>{t("common.organization")}</TableHead>
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

      {/* Ariza tafsilotlari — hujjatni ko'rib chiqib tasdiqlash */}
      <ApplicationDetailDialog
        app={detailApp}
        onClose={() => setDetailApp(null)}
        isSuperAdmin={isSuperAdmin}
        onApprove={handleApprove}
        onReturn={openReturnDialog}
        onReject={handleReject}
        onConfirmScan={handleConfirmScan}
        approvePending={approve.isPending}
        rejectPending={reject.isPending}
        confirmScanPending={confirmScan.isPending}
      />

      {/* Return Dialog */}
      <Dialog open={returnDialog.open} onOpenChange={(o) => !o && setReturnDialog({ open: false, app: null })}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t("adminApplications.returnDialogTitle")}</DialogTitle>
                <DialogDescription>
                    {t("adminApplications.returnDialogDescription")}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Input
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    placeholder={t("adminApplications.returnReasonPlaceholder")}
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setReturnDialog({ open: false, app: null })}>{t("common.cancel")}</Button>
                <Button onClick={handleReturn} disabled={returnApp.isPending}>
                    {returnApp.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t("adminApplications.returnSubmit")}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!archiveTarget}
        title={
          archiveTarget?.action === "archive"
            ? t("adminContracts.archiveConfirmTitle")
            : t("adminContracts.unarchiveConfirmTitle")
        }
        description={
          archiveTarget?.action === "archive"
            ? t("adminContracts.archiveConfirmMessage")
            : t("adminContracts.unarchiveConfirmMessage")
        }
        confirmText={
          archiveTarget?.action === "archive"
            ? t("adminContracts.archiveButton")
            : t("adminContracts.unarchiveButton")
        }
        variant={archiveTarget?.action === "archive" ? "destructive" : "default"}
        isPending={archive.isPending || unarchive.isPending}
        onConfirm={handleArchiveConfirm}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}

// ─── Ariza tafsilotlari dialogi ─────────────────────────────
type DetailProps = {
  app: PracticeApplication | null;
  onClose: () => void;
  isSuperAdmin: boolean;
  onApprove: (a: PracticeApplication) => void;
  onReturn: (a: PracticeApplication) => void;
  onReject: (a: PracticeApplication) => void;
  onConfirmScan: (a: PracticeApplication) => void;
  approvePending: boolean;
  rejectPending: boolean;
  confirmScanPending: boolean;
};

function ApplicationDetailDialog({
  app,
  onClose,
  isSuperAdmin,
  onApprove,
  onReturn,
  onReject,
  onConfirmScan,
  approvePending,
  rejectPending,
  confirmScanPending,
}: DetailProps) {
  const { t } = useTranslation();
  const archive = useArchiveApplication();
  const unarchive = useUnarchiveApplication();
  const { data: formFields } = useTemplateFormFields(app?.contract_template_id);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleArchive = async () => {
    if (!app) return;
    try {
      await archive.mutateAsync(app.id);
      toast.success(t("adminApplications.status.archived") + " qilindi");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  // PDF preview — hujjat mazmunini tasdiqlashdan OLDIN ko'rish
  useEffect(() => {
    setPdfUrl(null);
    setPdfError(null);
    if (!app || !app.contract_template_id) return;

    let active = true;
    let urlToRevoke: string | null = null;
    setPdfLoading(true);
    previewContractPdf(app.id)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        urlToRevoke = url;
        setPdfUrl(url);
      })
      .catch((e) => {
        if (active) setPdfError(e instanceof Error ? e.message : t("common.error"));
      })
      .finally(() => {
        if (active) setPdfLoading(false);
      });

    return () => {
      active = false;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app?.id]);

  if (!app) return null;

  const labelFor = (key: string) =>
    formFields?.fields.find((f) => f.key === key)?.label ?? key;
  const variableEntries = Object.entries(app.variable_values ?? {});
  const badge = STATUS_BADGE[app.status];

  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle className="text-base">
              {t("adminApplications.detailTitle")}
            </DialogTitle>
            <Badge variant={badge?.variant ?? "default"}>
              {badge ? t(badge.labelKey) : app.status}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            {t("adminApplications.detailDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Talaba ma'lumotlari */}
          <div className="grid gap-x-6 gap-y-2 rounded-lg border border-border p-3 text-sm sm:grid-cols-2">
            <InfoRow label={t("common.student")} value={app.student_name} />
            <InfoRow label={t("common.group")} value={app.group_name} />
            <InfoRow label={t("common.direction")} value={app.direction_name} />
            <InfoRow
              label={t("common.course")}
              value={app.course ? t("common.courseN", { n: app.course }) : null}
            />
            <InfoRow label={t("adminApplications.templateName")} value={app.contract_template_name} />
            <InfoRow label={t("common.organization")} value={app.organization_name} />
            <InfoRow
              label={t("adminApplications.studentResidence")}
              value={[app.region, app.district].filter(Boolean).join(", ") || null}
            />
            <InfoRow label={t("common.note")} value={app.note} />
            {app.contract_number && (
              <InfoRow label="№" value={app.contract_number} />
            )}
          </div>

          {/* Qaytarish sababi / rad izohi */}
          {app.status === "revision_required" && app.return_reason && (
            <Alert variant="destructive">
              <AlertDescription>
                {t("adminApplications.reason", { reason: app.return_reason })}
              </AlertDescription>
            </Alert>
          )}
          {app.status === "rejected" && app.review_note && (
            <Alert variant="destructive">
              <AlertDescription>
                {t("adminApplications.reason", { reason: app.review_note })}
              </AlertDescription>
            </Alert>
          )}

          {/* Talaba kiritgan ma'lumotlar */}
          <div>
            <h4 className="mb-2 text-sm font-medium">{t("adminApplications.enteredData")}</h4>
            {variableEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("adminApplications.noEnteredData")}</p>
            ) : (
              <div className="grid gap-x-6 gap-y-1.5 rounded-lg border border-border bg-muted/20 p-3 text-sm sm:grid-cols-2">
                {variableEntries.map(([key, value]) => (
                  <InfoRow key={key} label={labelFor(key)} value={value == null ? null : String(value)} />
                ))}
              </div>
            )}
          </div>

          {/* Skan */}
          {app.has_scan_file && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium">{t("adminApplications.scanCopy")}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadApplicationScan(app.id).catch((e) =>
                    toast.error(e instanceof Error ? e.message : t("common.error")),
                  )
                }
              >
                <Eye className="mr-1 h-4 w-4" />
                {t("adminApplications.viewScan")}
              </Button>
            </div>
          )}

          {/* PDF preview */}
          <div>
            <h4 className="mb-2 text-sm font-medium">{t("adminApplications.pdfPreview")}</h4>
            {pdfLoading && (
              <div className="flex h-40 items-center justify-center rounded-lg border border-border">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("adminApplications.pdfLoading")}</span>
              </div>
            )}
            {pdfError && !pdfLoading && (
              <Alert variant="destructive">
                <AlertDescription>{pdfError}</AlertDescription>
              </Alert>
            )}
            {!app.contract_template_id && !pdfLoading && (
              <p className="text-sm text-muted-foreground">{t("adminApplications.noPreview")}</p>
            )}
            {pdfUrl && !pdfLoading && (
              <iframe
                src={`${pdfUrl}#toolbar=1&navpanes=0`}
                title={t("adminApplications.pdfPreview")}
                className="h-[55vh] w-full rounded-md border border-border bg-white shadow-sm"
              />
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 p-4">
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
          {app.status === "archived" || app.status === "expired" ? (
            <Button
              variant="outline"
              onClick={() => {
                unarchive.mutateAsync(app.id).then(() => {
                  toast.success(t("adminContracts.unarchivedSuccess"));
                  onClose();
                }).catch((e: unknown) => {
                  toast.error(e instanceof Error ? e.message : t("common.error"));
                });
              }}
              disabled={unarchive.isPending}
            >
              {unarchive.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <ArchiveRestore className="mr-1 h-4 w-4" />
              )}
              {t("adminContracts.unarchiveButton")}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleArchive}
              disabled={archive.isPending}
            >
              {archive.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Archive className="mr-1 h-4 w-4" />
              )}
              {t("adminContracts.archiveButton")}
            </Button>
          )}
          {app.status === "approved" && app.has_scan_file && (
            <Button
              variant="success"
              disabled={confirmScanPending}
              onClick={() => onConfirmScan(app)}
            >
              {confirmScanPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <FileCheck className="mr-1 h-4 w-4" />
              )}
              {t("adminApplications.confirmScan")}
            </Button>
          )}
          {isSuperAdmin && REVIEWABLE.includes(app.status) && (
            <>
              <Button
                variant="destructive"
                disabled={rejectPending}
                onClick={() => onReject(app)}
              >
                <X className="mr-1 h-4 w-4" />
                {t("common.reject")}
              </Button>
              <Button variant="outline" onClick={() => onReturn(app)}>
                <AlertCircle className="mr-1 h-4 w-4" />
                {t("adminApplications.returnForRevision")}
              </Button>
              <Button disabled={approvePending} onClick={() => onApprove(app)}>
                {approvePending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1 h-4 w-4" />
                )}
                {t("adminApplications.approveWithQr")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}:</span>
      <span className="min-w-0 break-words font-medium">{value}</span>
    </div>
  );
}
