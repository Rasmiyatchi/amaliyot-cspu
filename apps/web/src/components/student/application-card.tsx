import {
  CheckCircle2,
  ClipboardEdit,
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { describeRequestError } from "@/components/attendance/request-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  downloadApplicationScan,
  downloadContract,
  useContractTypes,
  useCreateApplication,
  useMyApplications,
  useResubmitApplication,
  useTemplateFormFields,
  useUploadApplicationScan,
  type PracticeApplication,
} from "@/lib/api/applications";

const STATUS: Record<
  string,
  { labelKey: string; variant: "secondary" | "success" | "destructive" | "warning" | "default" }
> = {
  draft: { labelKey: "studentApplicationCard.status.draft", variant: "default" },
  submitted: { labelKey: "studentApplicationCard.status.pending", variant: "secondary" },
  under_review: { labelKey: "studentApplicationCard.status.underReview", variant: "warning" },
  revision_required: {
    labelKey: "studentApplicationCard.status.revisionRequired",
    variant: "warning",
  },
  resubmitted: { labelKey: "studentApplicationCard.status.resubmitted", variant: "secondary" },
  approved: { labelKey: "studentApplicationCard.status.approved", variant: "success" },
  active: { labelKey: "studentApplicationCard.status.active", variant: "success" },
  rejected: { labelKey: "studentApplicationCard.status.rejected", variant: "destructive" },
  expired: { labelKey: "studentApplicationCard.status.expired", variant: "destructive" },
  archived: { labelKey: "studentApplicationCard.status.archived", variant: "default" },
};

/** Dialog rejimi: yangi ariza yoki qaytarilgan arizani tuzatish. */
type DialogMode = { kind: "new" } | { kind: "resubmit"; app: PracticeApplication };

export function StudentApplicationCard() {
  const { t } = useTranslation();
  const { data, isPending } = useMyApplications();
  const uploadScan = useUploadApplicationScan();
  const [mode, setMode] = useState<DialogMode | null>(null);

  // Yuklanayotgan skan — faqat shu ariza kartasida spinner (umumiy isPending emas)
  const uploadingId = uploadScan.isPending ? (uploadScan.variables?.id ?? null) : null;

  const handleDownloadContract = (a: PracticeApplication) =>
    downloadContract(a.id, a.contract_number).catch((e: unknown) =>
      toast.error(describeRequestError(e, t, "common.downloadError")),
    );

  const handleDownloadScan = (a: PracticeApplication) =>
    downloadApplicationScan(a.id).catch((e: unknown) =>
      toast.error(describeRequestError(e, t, "common.downloadError")),
    );

  const handleScanSelected = (a: PracticeApplication, input: HTMLInputElement) => {
    const file = input.files?.[0];
    // Xato bo'lsa xuddi shu faylni qayta tanlash mumkin bo'lsin (onChange yana ishlashi uchun)
    input.value = "";
    if (!file) return;
    uploadScan.mutate(
      { id: a.id, file },
      {
        onSuccess: () => toast.success(t("studentApplicationCard.scanUploaded")),
        onError: (err) => toast.error(describeRequestError(err, t)),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardEdit className="h-4 w-4 text-primary" />
          {t("studentApplicationCard.title")}
        </CardTitle>
        <Button size="sm" onClick={() => setMode({ kind: "new" })}>
          <Plus className="h-4 w-4" />
          {t("studentApplicationCard.newApplication")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("studentApplicationCard.empty")}</p>
        )}
        {data?.map((a) => {
          const location = [a.region, a.district].filter(Boolean).join(" ");
          const isUploading = uploadingId === a.id;
          return (
            <div key={a.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 break-words font-medium">
                  {a.contract_template_name ?? a.organization_name}
                </span>
                <Badge variant={STATUS[a.status]?.variant ?? "default"} className="shrink-0">
                  {STATUS[a.status] ? t(STATUS[a.status]!.labelKey) : a.status}
                </Badge>
              </div>
              <div className="mt-1 break-words text-xs text-muted-foreground">
                {[a.organization_name, location].filter(Boolean).join(" · ")}
              </div>
              {a.status === "rejected" && a.review_note && (
                <div className="mt-1 text-xs text-destructive">
                  {t("studentApplicationCard.reason", { note: a.review_note })}
                </div>
              )}
              {a.status === "revision_required" && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTitle className="text-sm">
                    {t("studentApplicationCard.returnedTitle")}
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {a.return_reason && (
                      <p className="mb-2">
                        {t("studentApplicationCard.reason", { note: a.return_reason })}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMode({ kind: "resubmit", app: a })}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      {t("studentApplicationCard.resubmitButton")}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {a.status === "active" && (
                <div className="mt-2 space-y-2 rounded-md border border-success/30 bg-success/10 p-2.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("studentApplicationCard.contractClosed")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("studentApplicationCard.contractClosedDescription")}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-success/20 pt-1">
                    {a.contract_number && (
                      <span className="text-xs font-semibold text-success">
                        № {a.contract_number}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDownloadContract(a)}
                      >
                        <Download className="h-4 w-4" />
                        {t("common.download")}
                      </Button>
                      {a.has_scan_file && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleDownloadScan(a)}
                        >
                          <FileText className="h-4 w-4" />
                          {t("studentApplicationCard.scanFile")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {a.status === "approved" && (
                <div className="mt-2 space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-success">
                      {a.contract_number
                        ? `№ ${a.contract_number}`
                        : t("studentApplicationCard.status.approved")}
                    </span>
                    {a.has_scan_file && (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50 text-[11px] text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      >
                        {t("studentApplicationCard.scanUploadedBadge")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDownloadContract(a)}
                    >
                      <Download className="h-4 w-4" />
                      {t("common.download")}
                    </Button>

                    {a.has_scan_file && (
                      <Button size="sm" variant="ghost" onClick={() => void handleDownloadScan(a)}>
                        <FileText className="h-4 w-4" />
                        {t("studentApplicationCard.scanFile")}
                      </Button>
                    )}

                    {/* Input ko'rinmas, lekin klaviatura bilan fokuslanadi — fokus halqasi label'da */}
                    <input
                      id={`scan-upload-${a.id}`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="peer sr-only"
                      disabled={isUploading}
                      onChange={(e) => handleScanSelected(a, e.currentTarget)}
                    />
                    <Label
                      htmlFor={`scan-upload-${a.id}`}
                      className={
                        isUploading
                          ? "inline-flex h-8 cursor-wait items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 text-xs font-medium opacity-70"
                          : "inline-flex h-8 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 text-xs font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
                      }
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {a.has_scan_file
                        ? t("studentApplicationCard.scanUpdate")
                        : t("studentApplicationCard.scanUpload")}
                    </Label>
                  </div>
                </div>
              )}
              {a.status === "approved" && !a.contract_number && a.qr_token && (
                <div className="mt-1 text-xs text-success">
                  {t("studentApplicationCard.qrToken", { token: a.qr_token })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
      {/* Har ochilishda (va rejim almashganda) forma noldan — eski qiymatlar o'tib ketmaydi */}
      {mode && (
        <ApplicationDialog
          key={mode.kind === "resubmit" ? mode.app.id : "new"}
          resubmitFor={mode.kind === "resubmit" ? mode.app : null}
          onClose={() => setMode(null)}
        />
      )}
    </Card>
  );
}

function prefilledValues(app: PracticeApplication | null): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(app?.variable_values ?? {})) {
    values[k] = String(v ?? "");
  }
  return values;
}

function ApplicationDialog({
  resubmitFor,
  onClose,
}: {
  resubmitFor: PracticeApplication | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateApplication();
  const resubmit = useResubmitApplication();
  const types = useContractTypes();
  const isResubmit = !!resubmitFor;
  const isBusy = create.isPending || resubmit.isPending;

  // Resubmit rejimida shablon fiksatsiya qilinadi va eski qiymatlar oldindan to'ldiriladi
  const [contractTypeId, setContractTypeId] = useState(
    () => resubmitFor?.contract_template_id ?? "",
  );
  const [note, setNote] = useState(() => resubmitFor?.note ?? "");
  const [values, setValues] = useState<Record<string, string>>(() => prefilledValues(resubmitFor));

  // Tanlangan shablonning dinamik maydonlari
  const { data: formFieldsData, isFetching: isLoadingFields } =
    useTemplateFormFields(contractTypeId);

  // Maydonlar kelganda bo'sh qolganlariga shablon standart qiymatlari
  useEffect(() => {
    const fields = formFieldsData?.fields;
    if (!fields) return;
    setValues((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const f of fields) {
        if (f.defaultValue && !next[f.key]) {
          next[f.key] = f.defaultValue;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [formFieldsData]);

  const setValue = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleTemplateChange = (id: string) => {
    setContractTypeId(id);
    // Boshqa shablonning qiymatlari yangi arizaga aralashmasin
    setValues({});
  };

  const handleSubmit = async () => {
    if (!contractTypeId) {
      toast.error(t("studentApplicationCard.templateRequired"));
      return;
    }

    // Majburiy dinamik maydonlar
    for (const field of formFieldsData?.fields ?? []) {
      const value = values[field.key];
      if (field.required && (value == null || String(value).trim() === "")) {
        toast.error(t("studentApplicationCard.fieldRequired", { label: field.label }));
        return;
      }
    }

    try {
      if (resubmitFor) {
        await resubmit.mutateAsync({ id: resubmitFor.id, variable_values: values });
        toast.success(t("studentApplicationCard.resubmittedToast"));
      } else {
        await create.mutateAsync({
          contract_template_id: contractTypeId,
          note: note.trim() || undefined,
          variable_values: values,
        });
        toast.success(t("studentApplicationCard.submitted"));
      }
      onClose();
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !isBusy && onClose()}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-6 text-left sm:pr-0">
          <DialogTitle className="text-base font-semibold sm:text-lg">
            {isResubmit
              ? t("studentApplicationCard.resubmitTitle")
              : t("studentApplicationCard.newApplication")}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isResubmit
              ? t("studentApplicationCard.resubmitDescription")
              : t("studentApplicationCard.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {resubmitFor?.return_reason && (
            <Alert variant="destructive" className="px-3 py-2.5">
              <AlertDescription className="break-words text-xs">
                {t("studentApplicationCard.reason", { note: resubmitFor.return_reason })}
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Label htmlFor="application-template" className="text-xs sm:text-sm">
              {t("studentApplicationCard.contractType")}
            </Label>
            {resubmitFor ? (
              <Input
                id="application-template"
                value={resubmitFor.contract_template_name ?? resubmitFor.organization_name ?? ""}
                disabled
                className="mt-1 text-xs sm:text-sm"
              />
            ) : (
              <Select value={contractTypeId} onValueChange={handleTemplateChange}>
                <SelectTrigger id="application-template" className="mt-1 text-xs sm:text-sm">
                  <SelectValue
                    placeholder={t("studentApplicationCard.selectTemplatePlaceholder")}
                  />
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
            )}
          </div>

          {isLoadingFields && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoadingFields && formFieldsData?.fields && formFieldsData.fields.length > 0 && (
            <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3 sm:p-4">
              <h4 className="text-xs font-medium sm:text-sm">
                {t("studentApplicationCard.contractDetails")}
              </h4>
              <div className="grid gap-3 sm:grid-cols-1">
                {formFieldsData.fields.map((field) => {
                  const fieldId = `application-field-${field.key}`;
                  return (
                    <div key={field.key}>
                      <Label htmlFor={fieldId} className="mb-1 block text-xs">
                        {field.label}{" "}
                        {field.required && <span className="text-destructive">*</span>}
                      </Label>

                      {field.type === "select" && field.options ? (
                        <Select
                          value={values[field.key] || ""}
                          onValueChange={(v) => setValue(field.key, v)}
                        >
                          <SelectTrigger id={fieldId} className="text-xs sm:text-sm">
                            <SelectValue
                              placeholder={
                                field.placeholder || t("studentApplicationCard.selectPlaceholder")
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === "textarea" ? (
                        <Textarea
                          id={fieldId}
                          value={values[field.key] || ""}
                          onChange={(e) => setValue(field.key, e.target.value)}
                          placeholder={field.placeholder || "..."}
                          rows={3}
                          className="text-xs sm:text-sm"
                        />
                      ) : (
                        <Input
                          id={fieldId}
                          type={
                            field.type === "date"
                              ? "date"
                              : field.type === "number"
                                ? "number"
                                : "text"
                          }
                          value={values[field.key] || ""}
                          onChange={(e) => setValue(field.key, e.target.value)}
                          placeholder={field.placeholder || "..."}
                          className="text-xs sm:text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isResubmit && (
            <div>
              <Label htmlFor="application-note" className="text-xs sm:text-sm">
                {t("studentApplicationCard.noteOptional")}
              </Label>
              <Textarea
                id="application-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 text-xs sm:text-sm"
              />
            </div>
          )}
        </div>
        <DialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row sm:gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isBusy} className="w-full sm:w-auto">
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isBusy || !contractTypeId}
            className="w-full sm:w-auto"
          >
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isResubmit
              ? t("studentApplicationCard.resubmitSubmit")
              : t("studentApplicationCard.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
