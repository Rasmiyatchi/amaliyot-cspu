import { Check, ClipboardEdit, Download, Layers, Loader2, X } from "lucide-react";
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
const STATUS_TABS: { value: string; labelKey: string }[] = [
  { value: ALL, labelKey: "common.all" },
  { value: "pending", labelKey: "adminApplications.status.pending" },
  { value: "approved", labelKey: "adminApplications.status.approved" },
  { value: "rejected", labelKey: "adminApplications.status.rejected" },
];
const STATUS_BADGE: Record<ApplicationStatus, { labelKey: string; variant: "secondary" | "success" | "destructive" }> = {
  pending: { labelKey: "adminApplications.status.pending", variant: "secondary" },
  approved: { labelKey: "adminApplications.status.approved", variant: "success" },
  rejected: { labelKey: "adminApplications.status.rejected", variant: "destructive" },
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
                    <TableHead>{t("adminApplications.colObject")}</TableHead>
                    <TableHead>{t("common.area")}</TableHead>
                    <TableHead>{t("adminApplications.colManagerPhone")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    {isSuperAdmin && <TableHead className="w-[120px]">{t("adminApplications.colAction")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 7 : 6} className="p-0">
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
                          {t(STATUS_BADGE[a.status].labelKey)}
                        </Badge>
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
                                title={t("adminApplications.approveWithQr")}
                                disabled={approve.isPending}
                                onClick={() => handleApprove(a)}
                              >
                                <Check className="h-4 w-4" />
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
                    <TableHead>{t("adminApplications.colObject")}</TableHead>
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
