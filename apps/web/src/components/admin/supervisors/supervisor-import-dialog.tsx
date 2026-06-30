import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import Papa from "papaparse";
import { useState, type ChangeEvent, type DragEvent } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadSupervisorsTemplate } from "@/lib/api/import-templates";
import {
  useSupervisorImport,
  type SupervisorImportResponse,
} from "@/lib/api/supervisors";
import { cn } from "@/lib/utils";

type Props = { open: boolean; onClose: () => void };

export function SupervisorImportDialog({ open, onClose }: Props) {
  const mut = useSupervisorImport();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<SupervisorImportResponse | null>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    mut.reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!/\.xlsx?$/i.test(f.name)) {
      toast.error(".xlsx fayl yuklang");
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      const res = await mut.mutateAsync(file);
      setResult(res);
      if (res.created > 0) {
        toast.success(`${res.created} ta supervizor qo'shildi`);
      } else if (res.errors.length > 0) {
        toast.error("Import xatolik bilan tugadi");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import muvaffaqiyatsiz");
    }
  };

  const downloadCredentials = () => {
    if (!result?.credentials.length) return;
    const csv = Papa.unparse(
      result.credentials.map((c) => ({
        full_name: c.full_name,
        username: c.username,
        password: c.password,
      })),
    );
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `chdpu-supervisors-credentials-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supervizorlar Excel import</DialogTitle>
          <DialogDescription>
            .xlsx faylni yuklang. Login berilmasa avtomatik yaratiladi (login = parol).
          </DialogDescription>
        </DialogHeader>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Yaratildi" value={result.created} tone="success" />
              <StatBox label="O'tkazildi" value={result.skipped} tone="muted" />
              <StatBox label="Xatolar" value={result.errors.length} tone="destructive" />
            </div>

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Import xatolari</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                    {result.errors.slice(0, 50).map((e, i) => (
                      <li key={i}>
                        <span className="font-mono">Row {e.row}</span>
                        {e.name ? ` · ${e.name}` : ""}: {e.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {result.credentials.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Login ma'lumotlari</h3>
                    <p className="text-xs text-muted-foreground">
                      Parollar faqat shu yerda ko'rsatiladi — CSV ni yuklab oling
                    </p>
                  </div>
                  <Button onClick={downloadCredentials}>
                    <Download className="h-4 w-4" />
                    CSV yuklab olish
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>F.I.SH.</TableHead>
                        <TableHead className="w-[150px] font-mono">Login</TableHead>
                        <TableHead className="w-[130px] font-mono">Parol</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.credentials.slice(0, 100).map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{c.full_name}</TableCell>
                          <TableCell className="font-mono text-xs">{c.username}</TableCell>
                          <TableCell className="font-mono text-xs">{c.password}</TableCell>
                        </TableRow>
                      ))}
                      {result.credentials.length > 100 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                            +{result.credentials.length - 100} ta — CSV'ni yuklab oling
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Upload */}
        {!result && !mut.isPending && (
          <div className="space-y-4">
            <div
              onDragOver={(e: DragEvent) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e: DragEvent) => {
                e.preventDefault();
                setDragActive(false);
                handleFile(e.dataTransfer.files[0] ?? null);
              }}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-border",
                file && "border-success bg-success/5",
              )}
            >
              {file ? (
                <>
                  <FileSpreadsheet className="mb-2 h-8 w-8 text-success" />
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="mt-2">
                    <X className="h-4 w-4" />
                    Bekor qilish
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <div className="mb-2 text-sm">Faylni shu yerga tortib tashlang yoki</div>
                  <label>
                    <Button asChild size="sm" variant="outline">
                      <span>Fayl tanlash</span>
                    </Button>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleFile(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                </>
              )}
            </div>

            <Alert variant="info">
              <AlertTitle>Kutilgan ustunlar</AlertTitle>
              <AlertDescription>
                <div className="mt-1 text-xs">
                  <strong>Majburiy</strong>: FISh (yagona ustun) yoki Familiya + Ism.
                  <br />
                  <strong>Ixtiyoriy</strong>: Fakultet, Kafedra, Lavozim, E-pochta, Telefon,
                  Mutaxassislik, Tashkilot (vergul bilan, max 5), Login.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    downloadSupervisorsTemplate().catch((e) =>
                      toast.error(e instanceof Error ? e.message : "Yuklab bo'lmadi"),
                    )
                  }
                >
                  <Download className="h-4 w-4" />
                  Namuna shablonni yuklab olish
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Processing */}
        {mut.isPending && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm font-medium">Import qilinyapti…</div>
            <Progress value={undefined} className="w-full max-w-xs" />
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>
              <CheckCircle2 className="h-4 w-4" />
              Yopish
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={mut.isPending}>
                Bekor qilish
              </Button>
              <Button onClick={handleUpload} disabled={!file || mut.isPending}>
                {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Upload className="h-4 w-4" />
                Import qilish
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "destructive" | "muted";
}) {
  const toneClass = {
    success: "border-success/30 bg-success/10 text-success",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
    muted: "border-border bg-muted/50 text-foreground",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-3 text-center", toneClass)}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs">{label}</div>
    </div>
  );
}
