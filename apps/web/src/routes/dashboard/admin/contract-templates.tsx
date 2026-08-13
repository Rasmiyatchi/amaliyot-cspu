import { Download, Edit, FileText, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isPending, error } = useContractTemplates();
  const practiceTypes = usePracticeTypes();
  const del = useDeleteContractTemplate();
  const [creating, setCreating] = useState(false);

  const ptName = (id: string | null) =>
    id ? (practiceTypes.data ?? []).find((p) => p.id === id)?.name : null;

  const handleDelete = async (tpl: ContractTemplateDoc) => {
    if (!confirm(t("adminContractTemplates.deleteConfirm", { name: tpl.name }))) return;
    try {
      await del.mutateAsync(tpl.id);
      toast.success(t("common.deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("adminContractTemplates.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("adminContractTemplates.subtitleEditor")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCreating(true)}>
            <Upload className="mr-1 h-4 w-4" />
            {t("adminContractTemplates.uploadDocx")}
          </Button>
          <Button onClick={() => navigate("/admin/contract-templates/new/edit")}>
            <Plus className="mr-1 h-4 w-4" />
            {t("adminContractTemplates.newTemplate")}
          </Button>
        </div>
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
            title={t("adminContractTemplates.emptyTitle")}
            description={t("adminContractTemplates.emptyDescription")}
          />
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3">
          {data.map((tpl) => (
            <div
              key={tpl.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">{tpl.name}</span>
                  {!tpl.is_active && (
                    <Badge variant="secondary">{t("adminContractTemplates.inactive")}</Badge>
                  )}
                  {tpl.html_content && (
                    <Badge variant="default" className="text-[10px]">HTML</Badge>
                  )}
                  {tpl.file_attachment && !tpl.html_content && (
                    <Badge variant="outline" className="text-[10px]">DOCX</Badge>
                  )}
                  {ptName(tpl.practice_type_id) && (
                    <Badge variant="outline">{ptName(tpl.practice_type_id)}</Badge>
                  )}
                </div>
                {tpl.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{tpl.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {t("adminContractTemplates.variables")}
                  </span>
                  {(tpl.placeholders || []).length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      {t("adminContractTemplates.noneFound")}
                    </span>
                  )}
                  {(tpl.placeholders || []).map((p) => (
                    <Badge key={p} variant="outline" className="font-mono text-xs">
                      {`{${p}}`}
                    </Badge>
                  ))}
                </div>
                {tpl.file_attachment && (
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {tpl.file_attachment.name} · {(tpl.file_attachment.size / 1024).toFixed(0)} KB
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate(`/admin/contract-templates/${tpl.id}/edit`)}
                >
                  <Edit className="mr-1 h-4 w-4" />
                  {t("common.edit")}
                </Button>
                {tpl.file_attachment && (
                  <Button
                    size="icon"
                    variant="ghost"
                    title={t("common.download")}
                    onClick={() =>
                      downloadContractTemplate(tpl.id, tpl.file_attachment!.name).catch((e) =>
                        toast.error(e instanceof Error ? e.message : t("common.error")),
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  title={t("common.delete")}
                  className="text-destructive"
                  onClick={() => handleDelete(tpl)}
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
  const { t } = useTranslation();
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
      toast.error(t("adminContractTemplates.docxOnly"));
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.docx$/i, ""));
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error(t("adminContractTemplates.selectFile"));
      return;
    }
    if (!name.trim()) {
      toast.error(t("adminContractTemplates.nameRequired"));
      return;
    }
    try {
      const tpl = await create.mutateAsync({
        file,
        name: name.trim(),
        description: description.trim() || undefined,
        practice_type_id: practiceTypeId === NONE ? undefined : practiceTypeId,
      });
      toast.success(t("adminContractTemplates.uploaded", { n: tpl.placeholders.length }));
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !create.isPending && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("adminContractTemplates.uploadTitle")}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="adminContractTemplates.uploadDescription"
              values={{ p1: "{{ ism }}", p2: "{{ sana }}", p3: "{{ qr }}" }}
              components={[<code key="0" />, <code key="1" />, <code key="2" />]}
            />
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
                  <span>{t("adminContractTemplates.chooseDocx")}</span>
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
            <Label>{t("adminContractTemplates.nameLabel")} *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("common.note")}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>{t("adminContractTemplates.practiceTypeOptional")}</Label>
            <Select value={practiceTypeId} onValueChange={setPracticeTypeId}>
              <SelectTrigger>
                <SelectValue placeholder={t("adminContractTemplates.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("adminContractTemplates.generalOption")}</SelectItem>
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
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
