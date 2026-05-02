import { HTTPError } from "ky";
import { Camera, Eye, EyeOff, Loader2, Save, UserCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useChangeMyPassword,
  useUpdateProfile,
  useUploadAvatar,
} from "@/lib/api/profile";
import { useAuthStore } from "@/stores/auth";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ProfileDialog({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const update = useUpdateProfile();
  const changePwd = useChangeMyPassword();
  const uploadAvatar = useUploadAvatar();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setMiddleName(user.middle_name ?? "");
      setEmail(user.email ?? "");
      setPhone(""); // phone not in User type — leaving blank
      setCurrentPwd("");
      setNewPwd("");
      setNewPwd2("");
    }
  }, [open, user]);

  if (!user) return null;

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Ism va familiya majburiy");
      return;
    }
    try {
      await update.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_name: middleName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      });
      toast.success("Profil yangilandi");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleChangePwd = async () => {
    if (newPwd.length < 4) {
      toast.error("Yangi parol kamida 4 belgi");
      return;
    }
    if (newPwd !== newPwd2) {
      toast.error("Parollar mos kelmaydi");
      return;
    }
    try {
      await changePwd.mutateAsync({
        current_password: currentPwd,
        new_password: newPwd,
      });
      toast.success("Parol o'zgartirildi");
      setCurrentPwd("");
      setNewPwd("");
      setNewPwd2("");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleAvatarSelect = async (file: File | null) => {
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      toast.success("Avatar yangilandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const initials =
    (lastName[0] ?? "") + (firstName[0] ?? "");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            Mening profilim
          </DialogTitle>
          <DialogDescription>
            {user.username} · {user.role}
          </DialogDescription>
        </DialogHeader>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="group relative h-20 w-20 shrink-0"
            title="Avatar o'zgartirish"
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                {initials.toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {uploadAvatar.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)}
          />
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold">{user.full_name}</div>
            <div className="truncate text-sm text-muted-foreground">
              {user.email ?? "Email kiritilmagan"}
            </div>
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="password">Parol</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="prof-last">Familiya *</Label>
                <Input
                  id="prof-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="prof-first">Ism *</Label>
                <Input
                  id="prof-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="prof-middle">Otasining ismi</Label>
                <Input
                  id="prof-middle"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="prof-email">Email</Label>
                <Input
                  id="prof-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="prof-phone">Telefon</Label>
                <Input
                  id="prof-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveProfile} disabled={update.isPending}>
                {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Saqlash
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="password" className="space-y-3">
            <Alert>
              <AlertDescription>
                Yangi parol kamida 4 belgi bo'lishi kerak. Parolni o'zgartirgandan keyin
                tizimdan chiqib qaytadan kirish tavsiya etiladi.
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <div>
                <Label htmlFor="cur-pwd">Joriy parol</Label>
                <div className="relative">
                  <Input
                    id="cur-pwd"
                    type={showPwd ? "text" : "password"}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="new-pwd">Yangi parol</Label>
                <Input
                  id="new-pwd"
                  type={showPwd ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="new-pwd2">Parolni takrorlang</Label>
                <Input
                  id="new-pwd2"
                  type={showPwd ? "text" : "password"}
                  value={newPwd2}
                  onChange={(e) => setNewPwd2(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleChangePwd}
                disabled={
                  changePwd.isPending || !currentPwd || newPwd.length < 4 || newPwd !== newPwd2
                }
              >
                {changePwd.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Parolni o'zgartirish
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
