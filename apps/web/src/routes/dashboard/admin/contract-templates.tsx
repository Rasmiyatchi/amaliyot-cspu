import { Download, FileText, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  downloadContractTemplate,
  useContractTemplates,
  useCreateContractTemplate,
  useDeleteContractTemplate,
  type ContractTemplateDoc,
} from "@/lib/api/contract-templates";
import { usePracticeTypes } from "@/lib/api/practice-types";

const NONE = "__none__";

export function ContractTemplatesPage() {
  const { data, isPending, error } = useContractTemplates();
  const practiceTypes = usePracticeTypes();
  const del = useDeleteContractTemplate();
  const [creating, setCreating] = useState(false);

  const ptName = (id: string | null) =>
    id ? (practiceTypes.data ?? []).find((p) => p.id === id)?.name : null;

  const handleDelete = async (t: ContractTemplateDoc) => {
    if (!confirm(`"${t.name}" shablonini o'chirishni tasdiqlang?`)) return;
    try {
      await del.mutateAsync(t.id);
      toast.success("O'chirildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Shartnoma shablonlari</h1>
            <p className="text-sm text-muted-foreground">
              DOCX shablon yuklang — <code>{"{{ maydon }}"}</code> joylar avtomatik aniqlanadi
            </p>
          </div>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Shablon yuklash
        </Button>
      </div>

      {isPending && (
        <div className="flex h-32 items-center justify-center">
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
            icon={FileText}
            title="Shablon yo'q"
            description="DOCX shablon yuklab boshlang"
          />
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3">
          {data.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  {!t.is_active && <Badge variant="secondary">Nofaol</Badge>}
                  {ptName(t.practice_type_id) && (
                    <Badge variant="outline">{ptName(t.practice_type_id)}</Badge>
                  )}
                </div>
                {t.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="text-xs text-muted-foreground">Maydonlar:</span>
                  {t.placeholders.length === 0 && (
                    <span className="text-xs text-muted-foreground">— topilmadi</span>
                  )}
                  {t.placeholders.map((p) => (
                    <Badge key={p} variant="outline" className="font-mono text-xs">
                      {`{{ ${p} }}`}
                    </Badge>
                  ))}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {t.file_attachment.name} · {(t.file_attachment.size / 1024).toFixed(0)} KB
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  title="Yuklab olish"
                  onClick={() =>
                    downloadContractTemplate(t.id, t.file_attachment.name).catch((e) =>
                      toast.error(e instanceof Error ? e.message : "Xatolik"),
                    )
                  }
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title="O'chirish"
                  className="text-destructive"
                  onClick={() => handleDelete(t)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateContractTemplate();
  const practiceTypes = usePracticeTypes();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [practiceTypeId, setPracticeTypeId] = useState(NONE);

  const reset = () => {
    setFile(null);
    setName("");
    setDescription("");
    setPracticeTypeId(NONE);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!/\.docx$/i.test(f.name)) {
      toast.error(".docx fayl yuklang");
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.docx$/i, ""));
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Fayl tanlang");
      return;
    }
    if (!name.trim()) {
      toast.error("Nom kiriting");
      return;
    }
    try {
      const t = await create.mutateAsync({
        file,
        name: name.trim(),
        description: description.trim() || undefined,
        practice_type_id: practiceTypeId === NONE ? undefined : practiceTypeId,
      });
      toast.success(`Shablon yuklandi — ${t.placeholders.length} ta maydon aniqlandi`);
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !create.isPending && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Shartnoma shabloni yuklash</DialogTitle>
          <DialogDescription>
            DOCX faylda to'ldiriladigan joylar <code>{"{{ ism }}"}</code>,{" "}
            <code>{"{{ sana }}"}</code> ko'rinishida belgilanadi. QR uchun{" "}
            <code>{"{{ qr }}"}</code> ishlating.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-success" />
                {file.name}
                <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className="mb-2 flex justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <Button asChild size="sm" variant="outline">
                  <span>.docx tanlash</span>
                </Button>
                <input
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleFile(e.target.files?.[0] ?? null)
                  }
                />
              </label>
            )}
          </div>
          <div>
            <Label>Nom *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Izoh</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Amaliyot turi (ixtiyoriy)</Label>
            <Select value={practiceTypeId} onValueChange={setPracticeTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Umumiy (turidan mustaqil)</SelectItem>
                {(practiceTypes.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={create.isPending}>
            Bekor
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Yuklash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
