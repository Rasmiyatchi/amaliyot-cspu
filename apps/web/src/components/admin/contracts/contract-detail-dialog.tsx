import { HTTPError } from "ky";
import { AlertCircle, Download, FileText, Loader2, Upload, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ContractStatusBadge } from "@/components/admin/contracts/contract-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { dateLocale } from "@/i18n";
import {
  useGenerateContractPdf,
  useRevokeContract,
  useUploadContractScan,
} from "@/lib/api/contracts";
import type { Contract } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

type Props = { contract: Contract | null; onClose: () => void };

export function ContractDetailDialog({ contract, onClose }: Props) {
  const { t } = useTranslation();
  const gen = useGenerateContractPdf();
  const upload = useUploadContractScan();
  const revoke = useRevokeContract();
  const fileRef = useRef<HTMLInputElement>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeMode, setRevokeMode] = useState(false);

  if (!contract) return null;

  const handleGenerate = async () => {
    try {
      await gen.mutateAsync(contract.id);
      toast.success(t("contractsContractDetailDialog.pdfGenerated"));
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleDownloadPdf = async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      toast.error(t("contractsContractDetailDialog.sessionExpired"));
      return;
    }
    const res = await fetch(`/api/v1/contracts/${contract.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      toast.error(t("contractsContractDetailDialog.pdfDownloadFailed"));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contract.number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadScan = async (file: File | null) => {
    if (!file) return;
    try {
      await upload.mutateAsync({ id: contract.id, file });
      toast.success(t("contractsContractDetailDialog.scanUploaded"));
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleRevoke = async () => {
    if (revokeReason.length < 3) {
      toast.error(t("contractsContractDetailDialog.reasonRequired"));
      return;
    }
    try {
      await revoke.mutateAsync({ id: contract.id, reason: revokeReason });
      toast.success(t("contractsContractDetailDialog.revokedToast"));
      setRevokeMode(false);
      setRevokeReason("");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const verifyUrl = `${window.location.origin}/verify/${contract.qr_token}`;

  return (
    <Dialog open={!!contract} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div>{contract.number}</div>
              <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                {contract.organization_name} · {contract.practice_type_name}
              </div>
            </div>
            <ContractStatusBadge status={contract.status} />
          </DialogTitle>
          <DialogDescription>
            {new Date(contract.start_date).toLocaleDateString(dateLocale())} —{" "}
            {new Date(contract.end_date).toLocaleDateString(dateLocale())} ·{" "}
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

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {contract.status === "draft" && (
            <Button onClick={handleGenerate} disabled={gen.isPending}>
              {gen.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <FileText className="h-4 w-4" />
              {t("contractsContractDetailDialog.generatePdf")}
            </Button>
          )}
          {contract.pdf_path && (
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" />
              {t("contractsContractDetailDialog.downloadPdf")}
            </Button>
          )}
          {(contract.status === "generated" || contract.status === "active") && (
            <>
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={upload.isPending}
              >
                {upload.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Upload className="h-4 w-4" />
                {contract.scan_path
                  ? t("contractsContractDetailDialog.replaceScan")
                  : t("contractsContractDetailDialog.uploadScan")}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleUploadScan(e.target.files?.[0] ?? null)}
              />
            </>
          )}
          {contract.status !== "revoked" && contract.status !== "expired" && (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => setRevokeMode(!revokeMode)}
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
                rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRevoke}
                  disabled={revoke.isPending || revokeReason.length < 3}
                >
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

        {/* Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t("contractsContractDetailDialog.template")}
            </dt>
            <dd className="font-mono">{contract.template_ref}</dd>
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
                ? new Date(contract.generated_at).toLocaleString(dateLocale())
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t("contractsContractDetailDialog.scanUploadedAt")}
            </dt>
            <dd>
              {contract.signed_at_org
                ? new Date(contract.signed_at_org).toLocaleString(dateLocale())
                : "—"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">
              {t("contractsContractDetailDialog.qrPublicUrl")}
            </dt>
            <dd className="break-all font-mono text-xs">{verifyUrl}</dd>
          </div>
        </div>

        <Separator />

        {/* Students table */}
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
  );
}
