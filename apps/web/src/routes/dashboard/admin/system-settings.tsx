import { HTTPError } from "ky";
import {
  AlertTriangle,
  Bell,
  FileText,
  Loader2,
  Power,
  Save,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useSystemSettings,
  useUpdateSystemSettings,
} from "@/lib/api/system-settings";
import { useAuthStore } from "@/stores/auth";

export function SystemSettingsPage() {
  const me = useAuthStore((s) => s.user);
  const isSuperAdmin = me?.role === "super_admin";
  const { data, isPending, error } = useSystemSettings();
  const update = useUpdateSystemSettings();

  const [siteName, setSiteName] = useState("");
  const [siteDesc, setSiteDesc] = useState("");
  const [maxFileSize, setMaxFileSize] = useState(10);
  const [allowedTypes, setAllowedTypes] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [confirmMaintenance, setConfirmMaintenance] = useState<boolean | null>(null);

  useEffect(() => {
    if (data) {
      setSiteName(data.site_name);
      setSiteDesc(data.site_description ?? "");
      setMaxFileSize(data.max_file_size_mb);
      setAllowedTypes(data.allowed_file_types.join(", "));
      setEmailNotif(data.email_notifications_enabled);
      setMaintenance(data.maintenance_mode);
      setMaintenanceMsg(data.maintenance_message ?? "");
    }
  }, [data]);

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    try {
      await update.mutateAsync({
        site_name: siteName.trim(),
        site_description: siteDesc.trim() || null,
        max_file_size_mb: maxFileSize,
        allowed_file_types: allowedTypes
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
        email_notifications_enabled: emailNotif,
      });
      toast.success("Sozlamalar saqlandi");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleMaintenanceToggle = async () => {
    if (!isSuperAdmin || confirmMaintenance === null) return;
    try {
      await update.mutateAsync({
        maintenance_mode: confirmMaintenance,
        maintenance_message: confirmMaintenance ? maintenanceMsg.trim() || null : null,
      });
      toast.success(confirmMaintenance ? "Profilaktika yoqildi" : "Profilaktika o'chirildi");
      setConfirmMaintenance(null);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Bu sahifaga faqat Super Admin kira oladi
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Tizim sozlamalari</h1>
          <p className="text-sm text-muted-foreground">
            Platforma global konfiguratsiyasi
          </p>
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

      {data && (
        <div className="space-y-6">
          {/* Maintenance — eng yuqorida, alohida card */}
          <Card className={maintenance ? "border-destructive/50" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Power
                  className={
                    maintenance ? "h-4 w-4 text-destructive" : "h-4 w-4 text-success"
                  }
                />
                Profilaktika rejimi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {maintenance && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Saytni faqat Super Admin ko'ra oladi</AlertTitle>
                  <AlertDescription>
                    Boshqa foydalanuvchilarga 503 xatosi qaytariladi.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="maint-msg">Foydalanuvchilarga xabar</Label>
                <textarea
                  id="maint-msg"
                  value={maintenanceMsg}
                  onChange={(e) => setMaintenanceMsg(e.target.value)}
                  rows={2}
                  placeholder="Tizim yangilanmoqda. 30 daqiqada ochiladi."
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end">
                {maintenance ? (
                  <Button
                    variant="outline"
                    onClick={() => setConfirmMaintenance(false)}
                    disabled={update.isPending}
                  >
                    {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Profilaktikani o'chirish
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmMaintenance(true)}
                    disabled={update.isPending}
                  >
                    {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Power className="h-4 w-4" />
                    Profilaktikani yoqish
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* General settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Umumiy sozlamalar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="site-name">Sayt nomi *</Label>
                <Input
                  id="site-name"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="site-desc">Sayt tavsifi</Label>
                <textarea
                  id="site-desc"
                  value={siteDesc}
                  onChange={(e) => setSiteDesc(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* File upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Fayl yuklash limitlari
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="max-size">Maksimal hajm (MB)</Label>
                  <Input
                    id="max-size"
                    type="number"
                    min={1}
                    max={500}
                    value={maxFileSize}
                    onChange={(e) => setMaxFileSize(Number(e.target.value) || 10)}
                  />
                </div>
                <div>
                  <Label htmlFor="allowed-types">
                    Ruxsat etilgan turlar (vergul bilan)
                  </Label>
                  <Input
                    id="allowed-types"
                    value={allowedTypes}
                    onChange={(e) => setAllowedTypes(e.target.value)}
                    placeholder="pdf, jpg, png, docx"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Bildirishnomalar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={emailNotif}
                  onChange={(e) => setEmailNotif(e.target.checked)}
                  className="h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium">Email bildirishnomalar</div>
                  <div className="text-xs text-muted-foreground">
                    SMTP sozlangandan keyin ishlaydi (hozircha placeholder)
                  </div>
                </div>
              </label>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Sozlamalarni saqlash
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmMaintenance !== null}
        title={
          confirmMaintenance
            ? "Profilaktikani yoqish?"
            : "Profilaktikani o'chirish?"
        }
        description={
          confirmMaintenance ? (
            <>
              Hamma foydalanuvchilarga (Super Admin tashqari) tizim vaqtincha mavjud
              emasligini ko'rsatish boshlanadi. Talabalar va supervizorlar ishlay
              olmaydilar.
            </>
          ) : (
            "Tizim hammaga ochiladi va normal ishlay boshlaydi."
          )
        }
        variant={confirmMaintenance ? "destructive" : "default"}
        confirmText={confirmMaintenance ? "Yoqish" : "O'chirish"}
        isPending={update.isPending}
        onConfirm={handleMaintenanceToggle}
        onClose={() => setConfirmMaintenance(null)}
      />
    </div>
  );
}
