import { HTTPError } from "ky";
import { Camera, Eye, EyeOff, Loader2, Save, UserCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      setPhone(user.phone ?? "");
      setCurrentPwd("");
      setNewPwd("");
      setNewPwd2("");
    }
  }, [open, user]);

  if (!user) return null;

  const isStudent = user.role === "student";

  const handleSaveProfile = async () => {
    try {
      if (isStudent) {
        await update.mutateAsync({
          email: email.trim() || null,
          phone: phone.trim() || null,
        });
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          toast.error(t("profileDialog.nameRequired"));
          return;
        }
        await update.mutateAsync({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          middle_name: middleName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        });
      }
      toast.success(t("profileDialog.profileUpdated"));
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleChangePwd = async () => {
    if (newPwd.length < 4) {
      toast.error(t("profileDialog.pwdTooShort"));
      return;
    }
    if (newPwd !== newPwd2) {
      toast.error(t("profileDialog.pwdMismatch"));
      return;
    }
    try {
      await changePwd.mutateAsync({
        current_password: currentPwd,
        new_password: newPwd,
      });
      toast.success(t("profileDialog.pwdChanged"));
      setCurrentPwd("");
      setNewPwd("");
      setNewPwd2("");
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleAvatarSelect = async (file: File | null) => {
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      toast.success(t("profileDialog.avatarUpdated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const initials =
    (lastName[0] ?? "") + (firstName[0] ?? "");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88dvh] sm:max-w-xl overflow-y-auto">
        <DialogHeader className="pr-6 sm:pr-0 text-left">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <UserCircle className="h-5 w-5 text-primary" />
            {t("profileDialog.title")}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {user.username} · {user.role}
          </DialogDescription>
        </DialogHeader>

        {/* Avatar */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => fileRef.current?.click()}
            className="group relative h-16 w-16 sm:h-20 sm:w-20 shrink-0"
            title={t("profileDialog.changeAvatar")}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/10 text-xl sm:text-2xl font-semibold text-primary">
                {initials.toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {uploadAvatar.isPending ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
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
            <div className="text-sm sm:text-base font-semibold truncate">{user.full_name}</div>
            <div className="truncate text-xs sm:text-sm text-muted-foreground">
              {user.email ?? t("profileDialog.noEmail")}
            </div>
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="text-xs sm:text-sm">{t("profileDialog.tabs.profile")}</TabsTrigger>
            <TabsTrigger value="password" className="text-xs sm:text-sm">{t("profileDialog.tabs.password")}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-3 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="prof-last" className="text-xs sm:text-sm">{t("profileDialog.lastName")} *</Label>
                <Input
                  id="prof-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isStudent}
                  className="mt-1 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="prof-first" className="text-xs sm:text-sm">{t("profileDialog.firstName")} *</Label>
                <Input
                  id="prof-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isStudent}
                  className="mt-1 text-xs sm:text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="prof-middle" className="text-xs sm:text-sm">{t("profileDialog.middleName")}</Label>
                <Input
                  id="prof-middle"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  disabled={isStudent}
                  className="mt-1 text-xs sm:text-sm"
                />
                {isStudent && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t("profileDialog.studentNameReadonlyHint", {
                      defaultValue: "Familiya, ism va otasining ismini faqat administrator o'zgartira oladi.",
                    })}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="prof-email" className="text-xs sm:text-sm">Email</Label>
                <Input
                  id="prof-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="prof-phone" className="text-xs sm:text-sm">{t("profileDialog.phone")}</Label>
                <Input
                  id="prof-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="mt-1 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveProfile} disabled={update.isPending} className="w-full sm:w-auto">
                {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                {t("common.save")}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="password" className="space-y-3 pt-2">
            <Alert className="py-2.5 px-3">
              <AlertDescription className="text-xs">
                {t("profileDialog.pwdHint")}
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <div>
                <Label htmlFor="cur-pwd" className="text-xs sm:text-sm">{t("profileDialog.currentPwd")}</Label>
                <div className="relative mt-1">
                  <Input
                    id="cur-pwd"
                    type={showPwd ? "text" : "password"}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    autoComplete="current-password"
                    className="pr-10 text-xs sm:text-sm"
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
                <Label htmlFor="new-pwd" className="text-xs sm:text-sm">{t("profileDialog.newPwd")}</Label>
                <Input
                  id="new-pwd"
                  type={showPwd ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="new-pwd2" className="text-xs sm:text-sm">{t("profileDialog.repeatPwd")}</Label>
                <Input
                  id="new-pwd2"
                  type={showPwd ? "text" : "password"}
                  value={newPwd2}
                  onChange={(e) => setNewPwd2(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleChangePwd}
                disabled={
                  changePwd.isPending || !currentPwd || newPwd.length < 4 || newPwd !== newPwd2
                }
                className="w-full sm:w-auto"
              >
                {changePwd.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("profileDialog.changePwdBtn")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
