import { ClipboardEdit, Loader2, Plus } from "lucide-react";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateApplication,
  useMyApplications,
  type ApplicationStatus,
} from "@/lib/api/applications";

const STATUS: Record<ApplicationStatus, { label: string; variant: "secondary" | "success" | "destructive" }> = {
  pending: { label: "Ko'rib chiqilmoqda", variant: "secondary" },
  approved: { label: "Tasdiqlangan", variant: "success" },
  rejected: { label: "Rad etilgan", variant: "destructive" },
};

export function StudentApplicationCard() {
  const { data, isPending } = useMyApplications();
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardEdit className="h-4 w-4 text-primary" />
          Amaliyot arizalari
        </CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Yangi ariza
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Hali ariza yo'q. Amaliyot o'tadigan obyekt uchun ariza yuboring.
          </p>
        )}
        {data?.map((a) => (
          <div key={a.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{a.object_name}</span>
              <Badge variant={STATUS[a.status].variant}>{STATUS[a.status].label}</Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {a.object_location} · Rahbar: {a.manager_phone}
            </div>
            {a.status === "rejected" && a.review_note && (
              <div className="mt-1 text-xs text-destructive">Sabab: {a.review_note}</div>
            )}
            {a.status === "approved" && a.qr_token && (
              <div className="mt-1 text-xs text-success">Tasdiq kodi: {a.qr_token}</div>
            )}
          </div>
        ))}
      </CardContent>
      <ApplicationDialog open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

function ApplicationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateApplication();
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

  const reset = () =>
    setForm({
      object_name: "",
      object_location: "",
      manager_name: "",
      manager_phone: "",
      region: "",
      district: "",
      note: "",
    });

  const handleSubmit = async () => {
    if (!form.object_name.trim() || !form.object_location.trim() || !form.manager_phone.trim()) {
      toast.error("Obyekt nomi, joylashuv va rahbar telefoni majburiy");
      return;
    }
    try {
      await create.mutateAsync({
        object_name: form.object_name.trim(),
        object_location: form.object_location.trim(),
        manager_name: form.manager_name.trim() || undefined,
        manager_phone: form.manager_phone.trim(),
        region: form.region.trim() || undefined,
        district: form.district.trim() || undefined,
        note: form.note.trim() || undefined,
      });
      toast.success("Ariza yuborildi — super admin tasdiqini kuting");
      reset();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !create.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Amaliyot arizasi</DialogTitle>
          <DialogDescription>
            Amaliyot o'tadigan obyekt ma'lumotlarini kiriting. Super admin QR kod bilan
            tasdiqlaydi.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Obyekt nomi *</Label>
            <Input
              value={form.object_name}
              onChange={(e) => set("object_name", e.target.value)}
              placeholder="21-sonli umumiy o'rta ta'lim maktabi"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Joylashuv (manzil) *</Label>
            <Input
              value={form.object_location}
              onChange={(e) => set("object_location", e.target.value)}
              placeholder="Toshkent viloyati, Chirchiq shahri, ..."
            />
          </div>
          <div>
            <Label>Rahbar F.I.SH.</Label>
            <Input value={form.manager_name} onChange={(e) => set("manager_name", e.target.value)} />
          </div>
          <div>
            <Label>Rahbar telefoni *</Label>
            <Input
              value={form.manager_phone}
              onChange={(e) => set("manager_phone", e.target.value)}
              placeholder="+998..."
            />
          </div>
          <div>
            <Label>Viloyat</Label>
            <Input value={form.region} onChange={(e) => set("region", e.target.value)} />
          </div>
          <div>
            <Label>Tuman</Label>
            <Input value={form.district} onChange={(e) => set("district", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Izoh</Label>
            <Textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            Bekor
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Yuborish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
