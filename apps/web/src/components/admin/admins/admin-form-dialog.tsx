import { HTTPError } from "ky";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CredentialsSection } from "@/components/admin/credentials-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import {
  useCreateAdmin,
  useUpdateAdmin,
  useUpdateAdminCredentials,
} from "@/lib/api/admins";
import type { Admin } from "@/lib/api/types";

type Props = {
  open: boolean;
  existing: Admin | null;
  onClose: () => void;
};

export function AdminFormDialog({ open, existing, onClose }: Props) {
  const create = useCreateAdmin();
  const update = useUpdateAdmin();
  const updateCreds = useUpdateAdminCredentials();
  const isEdit = !!existing;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && existing) {
      setUsername(existing.username);
      setPassword("");
      setFirstName(existing.first_name);
      setLastName(existing.last_name);
      setMiddleName(existing.middle_name ?? "");
      setEmail(existing.email ?? "");
      setPhone(existing.phone ?? "");
      setRole(existing.role);
      setIsActive(existing.is_active);
    } else if (open) {
      setUsername("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setMiddleName("");
      setEmail("");
      setPhone("");
      setRole("admin");
      setIsActive(true);
    }
  }, [open, existing]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Ism va familiya majburiy");
      return;
    }

    const basePayload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      middle_name: middleName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      role,
    };

    try {
      if (isEdit && existing) {
        await update.mutateAsync({
          id: existing.id,
          data: { ...basePayload, is_active: isActive },
        });
        toast.success("Yangilandi");
      } else {
        if (username.trim().length < 3 || password.length < 4) {
          toast.error("Username (≥3) va parol (≥4) majburiy");
          return;
        }
        await create.mutateAsync({
          ...basePayload,
          username: username.trim(),
          password,
        });
        toast.success("Admin yaratildi");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isEdit ? "Adminni tahrirlash" : "Yangi admin"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Profil ma'lumotlari va rolini o'zgartirish"
              : "Admin yoki super admin foydalanuvchi yaratish"}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="adm-username">Username *</Label>
                <Input
                  id="adm-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="off"
                />
              </div>
              <div>
                <Label htmlFor="adm-password">Parol *</Label>
                <Input
                  id="adm-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Separator />
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="adm-last">Familiya *</Label>
            <Input
              id="adm-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="adm-first">Ism *</Label>
            <Input
              id="adm-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="adm-middle">Otasining ismi</Label>
            <Input
              id="adm-middle"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="adm-email">Email</Label>
            <Input
              id="adm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="adm-phone">Telefon</Label>
            <Input
              id="adm-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="adm-role">Rol *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "super_admin")}>
              <SelectTrigger id="adm-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isEdit && (
            <div>
              <Label htmlFor="adm-active">Holat</Label>
              <Select
                value={isActive ? "true" : "false"}
                onValueChange={(v) => setIsActive(v === "true")}
              >
                <SelectTrigger id="adm-active">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Aktiv</SelectItem>
                  <SelectItem value="false">Bloklangan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {role === "super_admin" && !isEdit && (
          <Alert>
            <AlertDescription>
              <strong>Diqqat:</strong> Super admin to'liq tizim ustidan nazoratga ega bo'ladi
              (override, sozlamalar, boshqa adminlarni boshqarish).
            </AlertDescription>
          </Alert>
        )}

        {isEdit && existing && (
          <>
            <Separator />
            <CredentialsSection
              currentUsername={existing.username}
              isPending={updateCreds.isPending}
              onSave={(payload) =>
                updateCreds.mutateAsync({ id: existing.id, data: payload })
              }
            />
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Bekor
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            {isEdit ? "Saqlash" : "Yaratish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
