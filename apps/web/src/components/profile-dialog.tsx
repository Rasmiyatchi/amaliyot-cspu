import { UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ProfilePanel } from "@/components/profile/profile-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ProfileDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88dvh] sm:max-w-xl overflow-y-auto">
        <DialogHeader className="pr-6 sm:pr-0 text-left">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <UserCircle className="h-5 w-5 text-primary" />
            {t("profileDialog.title")}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {user.username} · {t(`userRoles.${user.role}`)}
          </DialogDescription>
        </DialogHeader>

        <ProfilePanel active={open} />

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
