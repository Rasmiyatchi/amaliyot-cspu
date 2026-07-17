import { ClipboardEdit, Download, Loader2, Plus } from "lucide-react";
import { useState } from "react";
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
  type ApplicationStatus,
} from "@/lib/api/applications";

const STATUS: Record<ApplicationStatus, { labelKey: string; variant: "secondary" | "success" | "destructive" }> = {
  pending: { labelKey: "studentApplicationCard.status.pending", variant: "secondary" },
  approved: { labelKey: "studentApplicationCard.status.approved", variant: "success" },
  rejected: { labelKey: "studentApplicationCard.status.rejected", variant: "destructive" },
};

export function StudentApplicationCard() {
  const { t } = useTranslation();
  const { data, isPending } = useMyApplications();
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
                {a.contract_template_name ?? a.object_name}
              </span>
              <Badge variant={STATUS[a.status].variant}>{t(STATUS[a.status].labelKey)}</Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {a.object_name} · {a.object_location}
            </div>
            {a.status === "rejected" && a.review_note && (
              <div className="mt-1 text-xs text-destructive">
                {t("studentApplicationCard.reason", { note: a.review_note })}
              </div>
            )}
            {a.status === "approved" && a.contract_number && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-success">№ {a.contract_number}</span>
                {a.has_contract_file && (
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
                    {t("studentApplicationCard.downloadDocx")}
                  </Button>
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
  const [form, setForm] = useState({
    object_name: "",
    object_location: "",
    manager_name: "",
    manager_phone: "",
    region: "",
    district: "",
    note: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const reset = () => {
    setContractTypeId("");
    setForm({
      object_name: "",
      object_location: "",
      manager_name: "",
      manager_phone: "",
      region: "",
      district: "",
      note: "",
    });
  };

  const handleSubmit = async () => {
    if (!form.object_name.trim() || !form.object_location.trim() || !form.manager_phone.trim()) {
      toast.error(t("studentApplicationCard.requiredFields"));
      return;
    }
    try {
      await create.mutateAsync({
        contract_template_id: contractTypeId || undefined,
        object_name: form.object_name.trim(),
        object_location: form.object_location.trim(),
        manager_name: form.manager_name.trim() || undefined,
        manager_phone: form.manager_phone.trim(),
        region: form.region.trim() || undefined,
        district: form.district.trim() || undefined,
        note: form.note.trim() || undefined,
      });
      toast.success(t("studentApplicationCard.submitted"));
      reset();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !create.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("studentApplicationCard.newApplication")}</DialogTitle>
          <DialogDescription>
            {t("studentApplicationCard.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="mb-1">
          <Label>{t("studentApplicationCard.contractType")}</Label>
          <Select value={contractTypeId} onValueChange={setContractTypeId}>
            <SelectTrigger>
              <SelectValue placeholder={t("studentApplicationCard.selectOptional")} />
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t("studentApplicationCard.objectName")} *</Label>
            <Input
              value={form.object_name}
              onChange={(e) => set("object_name", e.target.value)}
              placeholder={t("studentApplicationCard.objectNamePlaceholder")}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("studentApplicationCard.location")} *</Label>
            <Input
              value={form.object_location}
              onChange={(e) => set("object_location", e.target.value)}
              placeholder={t("studentApplicationCard.locationPlaceholder")}
            />
          </div>
          <div>
            <Label>{t("studentApplicationCard.managerName")}</Label>
            <Input value={form.manager_name} onChange={(e) => set("manager_name", e.target.value)} />
          </div>
          <div>
            <Label>{t("studentApplicationCard.managerPhone")} *</Label>
            <Input
              value={form.manager_phone}
              onChange={(e) => set("manager_phone", e.target.value)}
              placeholder="+998..."
            />
          </div>
          <div>
            <Label>{t("studentApplicationCard.region")}</Label>
            <Input value={form.region} onChange={(e) => set("region", e.target.value)} />
          </div>
          <div>
            <Label>{t("studentApplicationCard.district")}</Label>
            <Input value={form.district} onChange={(e) => set("district", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("common.note")}</Label>
            <Textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("studentApplicationCard.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
