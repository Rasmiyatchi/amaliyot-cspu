import { ClipboardEdit, Download, Loader2, Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  downloadContract,
  useContractTypes,
  useCreateApplication,
  useMyApplications,
  useTemplateFormFields,
  useUploadApplicationScan,
} from "@/lib/api/applications";

const STATUS: Record<string, { labelKey: string; variant: "secondary" | "success" | "destructive" | "warning" | "default" }> = {
  draft: { labelKey: "Qoralama", variant: "default" },
  submitted: { labelKey: "studentApplicationCard.status.pending", variant: "secondary" },
  under_review: { labelKey: "Ko'rib chiqilmoqda", variant: "warning" },
  revision_required: { labelKey: "Tuzatish kerak", variant: "warning" },
  resubmitted: { labelKey: "Qayta yuborilgan", variant: "secondary" },
  approved: { labelKey: "studentApplicationCard.status.approved", variant: "success" },
  active: { labelKey: "Faol", variant: "success" },
  rejected: { labelKey: "studentApplicationCard.status.rejected", variant: "destructive" },
  expired: { labelKey: "Muddati o'tgan", variant: "destructive" },
  archived: { labelKey: "Arxivlangan", variant: "default" },
};


export function StudentApplicationCard() {
  const { t } = useTranslation();
  const { data, isPending } = useMyApplications();
  const uploadScan = useUploadApplicationScan();
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardEdit className="h-4 w-4 text-primary" />
          {t("studentApplicationCard.title")}
        </CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("studentApplicationCard.newApplication")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("studentApplicationCard.empty")}
          </p>
        )}
        {data?.map((a) => (
          <div key={a.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {a.contract_template_name ?? a.organization_name}
              </span>
              <Badge variant={STATUS[a.status]?.variant ?? "default"}>
                {STATUS[a.status] ? t(STATUS[a.status]!.labelKey) : a.status}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {a.organization_name} · {a.region} {a.district}
            </div>
            {a.status === "rejected" && a.review_note && (
              <div className="mt-1 text-xs text-destructive">
                {t("studentApplicationCard.reason", { note: a.review_note })}
              </div>
            )}
            {a.status === "revision_required" && a.return_reason && (
              <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Sabab: {a.return_reason}
              </div>
            )}
            {a.status === "approved" && a.contract_number && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-success">№ {a.contract_number}</span>
                {a.has_contract_file && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadContract(a.id, a.contract_number).catch((e) =>
                          toast.error(e instanceof Error ? e.message : t("common.error")),
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                      Yuklab olish
                    </Button>
                    
                    <Label
                      htmlFor={`scan-upload-${a.id}`}
                      className="inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 text-xs font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    >
                      {uploadScan.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {a.has_scan_file ? "Skan yangilash" : "Skan yuklash"}
                    </Label>
                    <input
                      id={`scan-upload-${a.id}`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      disabled={uploadScan.isPending}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadScan.mutate(
                            { id: a.id, file },
                            {
                              onSuccess: () => toast.success("Skan yuklandi"),
                              onError: (err) => toast.error(err.message || "Xatolik yuz berdi"),
                            }
                          );
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            {a.status === "approved" && !a.contract_number && a.qr_token && (
              <div className="mt-1 text-xs text-success">
                {t("studentApplicationCard.qrToken", { token: a.qr_token })}
              </div>
            )}
          </div>
        ))}
      </CardContent>
      <ApplicationDialog open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

function ApplicationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateApplication();
  const types = useContractTypes();
  const [contractTypeId, setContractTypeId] = useState("");
  
  // Dynamic fields for the selected template
  const { data: formFieldsData, isFetching: isLoadingFields } = useTemplateFormFields(contractTypeId);
  
  const [form, setForm] = useState({
    note: "",
    variable_values: {} as Record<string, any>,
  });

  const set = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));
  
  const reset = () => {
    setContractTypeId("");
    setForm({
      note: "",
      variable_values: {},
    });
  };

  const handleSubmit = async () => {
    if (!contractTypeId) {
      toast.error(t("studentApplicationCard.selectOptional")); // actually make it required
      return;
    }
    
    // Client-side validation for required dynamic fields
    if (formFieldsData?.fields) {
      for (const field of formFieldsData.fields) {
        if (field.required && (!form.variable_values[field.key] || form.variable_values[field.key].trim() === "")) {
          toast.error(`«${field.label}» maydoni to'ldirilishi shart`);
          return;
        }
      }
    }
    
    try {
      await create.mutateAsync({
        contract_template_id: contractTypeId,
        note: form.note.trim() || undefined,
        variable_values: form.variable_values,
      });
      toast.success(t("studentApplicationCard.submitted"));
      reset();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  // When form fields load, set default values
  useEffect(() => {
    if (formFieldsData?.fields) {
      const newValues = { ...form.variable_values };
      let changed = false;
      formFieldsData.fields.forEach(f => {
        if (f.defaultValue && !newValues[f.key]) {
          newValues[f.key] = f.defaultValue;
          changed = true;
        }
      });
      if (changed) {
        set("variable_values", newValues);
      }
    }
  }, [formFieldsData]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !create.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("studentApplicationCard.newApplication")}</DialogTitle>
          <DialogDescription>
            {t("studentApplicationCard.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("studentApplicationCard.contractType")}</Label>
            <Select value={contractTypeId} onValueChange={setContractTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Shablonni tanlang..." />
              </SelectTrigger>
              <SelectContent>
                {(types.data ?? []).length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {t("studentApplicationCard.noTypes")}
                  </div>
                )}
                {(types.data ?? []).map((ct) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    {ct.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isLoadingFields && (
            <div className="flex py-4 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {!isLoadingFields && formFieldsData?.fields && formFieldsData.fields.length > 0 && (
            <div className="space-y-4 rounded-md border border-border p-4 bg-muted/20">
              <h4 className="text-sm font-medium">Shartnoma ma'lumotlari</h4>
              <div className="grid gap-4 sm:grid-cols-1">
                {formFieldsData.fields.map((field) => (
                  <div key={field.key}>
                    <Label className="text-xs mb-1 block">
                      {field.label} {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    
                    {field.type === "select" && field.options ? (
                      <Select 
                        value={form.variable_values[field.key] || ""} 
                        onValueChange={(v) => 
                          set("variable_values", { ...form.variable_values, [field.key]: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || "Tanlang..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === "textarea" ? (
                      <Textarea
                        value={form.variable_values[field.key] || ""}
                        onChange={(e) =>
                          set("variable_values", { ...form.variable_values, [field.key]: e.target.value })
                        }
                        placeholder={field.placeholder || "..."}
                        rows={3}
                      />
                    ) : (
                      <Input
                        type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                        value={form.variable_values[field.key] || ""}
                        onChange={(e) =>
                          set("variable_values", { ...form.variable_values, [field.key]: e.target.value })
                        }
                        placeholder={field.placeholder || "..."}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>{t("common.note")} (Ixtiyoriy)</Label>
            <Textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending || !contractTypeId}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("studentApplicationCard.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
