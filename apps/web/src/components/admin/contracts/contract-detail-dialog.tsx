import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Download,
  Eye,
  FileText,
  Loader2,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ContractStatusBadge } from "@/components/admin/contracts/contract-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTashkentDate, formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { dateLocale } from "@/i18n";
import {
  downloadContractPdf,
  downloadContractScan,
  useArchiveContract,
  useContract,
  useDeleteContract,
  useGenerateContractPdf,
  useRevokeContract,
  useUnarchiveContract,
  useUploadContractScan,
} from "@/lib/api/contracts";
import type { Contract, ContractTemplate } from "@/lib/api/types";

const TEMPLATE_LABEL_KEY: Record<ContractTemplate, string> = {
  "4_plus_2": "verify.template.fourPlusTwo",
  pedagogical: "verify.template.pedagogical",
  qualifying: "verify.template.qualifying",
  internship_production: "verify.template.internshipProduction",
  partnership: "verify.template.partnership",
};

type Props = { contract: Contract | null; onClose: () => void };

export function ContractDetailDialog({ contract, onClose }: Props) {
  if (!contract) return null;
  // `key` — boshqa shartnoma ochilganda bekor qilish sababi va boshqa holatlar tozalanadi
  return <ContractDetailBody key={contract.id} initial={contract} onClose={onClose} />;
}

function ContractDetailBody({ initial, onClose }: { initial: Contract; onClose: () => void }) {
  const { t } = useTranslation();
  // Ro'yxatdagi nusxa eskirishi mumkin (PDF/skan/bekor qilishdan keyin) — joriy holat serverdan
  const { data: fresh } = useContract(initial.id);
  const contract = fresh ?? initial;

  const gen = useGenerateContractPdf();
  const upload = useUploadContractScan();
  const revoke = useRevokeContract();
  const archive = useArchiveContract();
  const unarchive = useUnarchiveContract();
  const deleteContract = useDeleteContract();
  const fileRef = useRef<HTMLInputElement>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeMode, setRevokeMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const errorMessage = (e: unknown) => (e instanceof Error ? e.message : t("common.error"));

  const handleGenerate = async () => {
    try {
      await gen.mutateAsync(contract.id);
      toast.success(t("contractsContractDetailDialog.pdfGenerated"));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadContractPdf(contract.id, contract.number);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("contractsContractDetailDialog.pdfDownloadFailed"),
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleViewScan = async () => {
    try {
      await downloadContractScan(contract.id, contract.number);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleUploadScan = async (file: File | null) => {
    if (!file) return;
    try {
      await upload.mutateAsync({ id: contract.id, file });
      toast.success(t("contractsContractDetailDialog.scanUploaded"));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      // Xuddi shu faylni qayta tanlash ham onChange'ni chaqirsin
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRevoke = async () => {
    const reason = revokeReason.trim();
    if (reason.length < 3) {
      toast.error(t("contractsContractDetailDialog.reasonRequired"));
      return;
    }
    try {
      await revoke.mutateAsync({ id: contract.id, reason });
      toast.success(t("contractsContractDetailDialog.revokedToast"));
      setRevokeMode(false);
      setRevokeReason("");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleArchive = async () => {
    try {
      await archive.mutateAsync(contract.id);
      toast.success(t("adminContracts.archivedSuccess"));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleUnarchive = async () => {
    try {
      await unarchive.mutateAsync(contract.id);
      toast.success(t("adminContracts.unarchivedSuccess"));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContract.mutateAsync(contract.id);
      toast.success(t("adminContracts.deletedSuccess"));
      setConfirmDelete(false);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const verifyUrl = `${window.location.origin}/verify/${contract.qr_token}`;
  const templateKey = TEMPLATE_LABEL_KEY[contract.template_ref];

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="break-words">{contract.number}</div>
                <div className="mt-0.5 break-words text-xs font-normal text-muted-foreground">
                  {contract.organization_name} · {contract.practice_type_name}
                </div>
              </div>
              <ContractStatusBadge status={contract.status} />
            </DialogTitle>
            <DialogDescription>
              {formatTashkentDate(contract.start_date, dateLocale())} —{" "}
              {formatTashkentDate(contract.end_date, dateLocale())} ·{" "}
              {t("contractsContractDetailDialog.studentsCount", {
                count: contract.students_count,
              })}
            </DialogDescription>
          </DialogHeader>

          {contract.revoked_reason && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("contractsContractDetailDialog.revokedTitle")}</AlertTitle>
              <AlertDescription>{contract.revoked_reason}</AlertDescription>
            </Alert>
          )}

          {/* Amallar */}
          <div className="flex flex-wrap gap-2">
            {contract.status === "draft" && (
              <Button onClick={handleGenerate} disabled={gen.isPending}>
                {gen.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {t("contractsContractDetailDialog.generatePdf")}
              </Button>
            )}
            {contract.pdf_path && (
              <Button variant="outline" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                {downloadingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t("contractsContractDetailDialog.downloadPdf")}
              </Button>
            )}
            {contract.scan_path && (
              <Button
                variant="outline"
                onClick={handleViewScan}
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
              >
                <Eye className="h-4 w-4" />
                {t("adminApplications.viewScan")}
              </Button>
            )}
            {(contract.status === "generated" || contract.status === "active") && (
              <>
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={upload.isPending}
                >
                  {upload.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {contract.scan_path
                    ? t("contractsContractDetailDialog.replaceScan")
                    : t("contractsContractDetailDialog.uploadScan")}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  aria-label={t("contractsContractDetailDialog.uploadScan")}
                  onChange={(e) => handleUploadScan(e.target.files?.[0] ?? null)}
                />
              </>
            )}
            {contract.status === "expired" ? (
              <>
                <Button variant="outline" onClick={handleUnarchive} disabled={unarchive.isPending}>
                  {unarchive.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArchiveRestore className="h-4 w-4" />
                  )}
                  {t("adminContracts.unarchiveButton")}
                </Button>
                <Button
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteContract.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("adminContracts.deleteButton")}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={handleArchive} disabled={archive.isPending}>
                {archive.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {t("adminContracts.archiveButton")}
              </Button>
            )}
            {contract.status !== "revoked" && contract.status !== "expired" && (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => setRevokeMode((m) => !m)}
                aria-expanded={revokeMode}
              >
                <XCircle className="h-4 w-4" />
                {t("contractsContractDetailDialog.revoke")}
              </Button>
            )}
          </div>

          {revokeMode && (
            <Alert>
              <AlertTitle>{t("contractsContractDetailDialog.revokeReasonTitle")}</AlertTitle>
              <AlertDescription className="space-y-2">
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder={t("contractsContractDetailDialog.reasonPlaceholder")}
                  aria-label={t("contractsContractDetailDialog.revokeReasonTitle")}
                  rows={2}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleRevoke}
                    disabled={revoke.isPending || revokeReason.trim().length < 3}
                  >
                    {revoke.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("common.confirm")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRevokeMode(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Ma'lumotlar */}
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("contractsContractDetailDialog.template")}
              </dt>
              <dd>{templateKey ? t(templateKey) : contract.template_ref}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("common.academicYear")}</dt>
              <dd>{contract.academic_year_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("contractsContractDetailDialog.pdfCreatedAt")}
              </dt>
              <dd>
                {contract.generated_at
                  ? formatTashkentDateTime(contract.generated_at, dateLocale())
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("contractsContractDetailDialog.scanUploadedAt")}
              </dt>
              <dd className="flex flex-wrap items-center gap-2">
                <span>
                  {contract.signed_at_org
                    ? formatTashkentDateTime(contract.signed_at_org, dateLocale())
                    : "—"}
                </span>
                {contract.scan_path && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 gap-1 px-2 text-xs text-primary"
                    onClick={handleViewScan}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("contractsContractDetailDialog.view")}
                  </Button>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">
                {t("contractsContractDetailDialog.qrPublicUrl")}
              </dt>
              <dd className="break-all font-mono text-xs">{verifyUrl}</dd>
            </div>
          </dl>

          <Separator />

          {/* Talabalar */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              {t("common.students")} ({contract.students_count})
            </h3>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>{t("common.fullName")}</TableHead>
                    <TableHead>{t("common.direction")}</TableHead>
                    <TableHead className="w-[80px]">{t("common.course")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.students.map((s, i) => (
                    <TableRow key={s.hemis_id}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-xs">
                        {s.direction_code} · {s.direction_name}
                      </TableCell>
                      <TableCell>{s.course}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title={t("adminContracts.deleteConfirmTitle")}
        description={t("adminContracts.deleteConfirmMessage")}
        confirmText={t("adminContracts.deleteButton")}
        variant="destructive"
        isPending={deleteContract.isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
