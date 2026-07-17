import { HTTPError } from "ky";
import { AlertCircle, Download, FileText, Loader2, Upload, XCircle } from "lucide-react";
import { useRef, useState } from "react";
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
import {
  useGenerateContractPdf,
  useRevokeContract,
  useUploadContractScan,
} from "@/lib/api/contracts";
import type { Contract } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth";

type Props = { contract: Contract | null; onClose: () => void };

export function ContractDetailDialog({ contract, onClose }: Props) {
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
      toast.success("PDF generatsiya qilindi");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleDownloadPdf = async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      toast.error("Sessiya tugagan, qayta kiring");
      return;
    }
    const res = await fetch(`/api/v1/contracts/${contract.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      toast.error("PDF yuklab olinmadi");
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
      toast.success("Skan yuklandi");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleRevoke = async () => {
    if (revokeReason.length < 3) {
      toast.error("Sababni yozing");
      return;
    }
    try {
      await revoke.mutateAsync({ id: contract.id, reason: revokeReason });
      toast.success("Shartnoma bekor qilindi");
      setRevokeMode(false);
      setRevokeReason("");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
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
            {new Date(contract.start_date).toLocaleDateString("uz-UZ")} —{" "}
            {new Date(contract.end_date).toLocaleDateString("uz-UZ")} ·{" "}
            {contract.students_count} talaba
          </DialogDescription>
        </DialogHeader>

        {contract.revoked_reason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Bekor qilingan</AlertTitle>
            <AlertDescription>{contract.revoked_reason}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {contract.status === "draft" && (
            <Button onClick={handleGenerate} disabled={gen.isPending}>
              {gen.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <FileText className="h-4 w-4" />
              PDF generatsiya
            </Button>
          )}
          {contract.pdf_path && (
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" />
              PDF yuklab olish
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
                {contract.scan_path ? "Skan almashtirish" : "Skan yuklash"}
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
              Bekor qilish
            </Button>
          )}
        </div>

        {revokeMode && (
          <Alert>
            <AlertTitle>Bekor qilish sababi</AlertTitle>
            <AlertDescription className="space-y-2">
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Sababni kiriting..."
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
                  Tasdiqlash
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRevokeMode(false)}>
                  Bekor
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Shablon</dt>
            <dd className="font-mono">{contract.template_ref}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">O'quv yili</dt>
            <dd>{contract.academic_year_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">PDF yaratildi</dt>
            <dd>
              {contract.generated_at
                ? new Date(contract.generated_at).toLocaleString("uz-UZ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Skan yuklangan</dt>
            <dd>
              {contract.signed_at_org
                ? new Date(contract.signed_at_org).toLocaleString("uz-UZ")
                : "—"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">QR public URL</dt>
            <dd className="break-all font-mono text-xs">{verifyUrl}</dd>
          </div>
        </div>

        <Separator />

        {/* Students table */}
        <div>
          <h3 className="mb-2 text-sm font-semibold">Talabalar ({contract.students_count})</h3>
          <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>F.I.SH.</TableHead>
                  <TableHead>Yo'nalish</TableHead>
                  <TableHead className="w-[80px]">Kurs</TableHead>
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
