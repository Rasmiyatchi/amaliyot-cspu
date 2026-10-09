import { Languages, LogOut, Palette, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ProfilePanel } from "@/components/profile/profile-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LANGUAGES } from "@/i18n";
import { logout } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

/**
 * "Profilim" — barcha rollar uchun alohida sahifa (telefonda dialog o'rniga).
 * Profil, parol, til, mavzu va chiqish bitta joyda.
 */
export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const currentLang = i18n.language.startsWith("ru") ? "ru" : "uz";

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    toast.success(t("rootLayout.logoutToast"));
    navigate("/login", { replace: true });
  };

  return (
    <main className="container mx-auto max-w-2xl px-3 py-4 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <UserCircle className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold sm:text-2xl">{t("profileDialog.title")}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {user.username} · {t(`userRoles.${user.role}`)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <ProfilePanel active />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("profilePage.settings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <Languages className="h-4 w-4 text-muted-foreground" />
                {t("common.language")}
              </span>
              <div
                className="inline-flex rounded-lg border border-border p-0.5"
                role="group"
                aria-label={t("common.language")}
              >
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    aria-pressed={currentLang === l.code}
                    onClick={() => void i18n.changeLanguage(l.code)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
                      currentLang === l.code
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4 text-muted-foreground" />
                {t("profilePage.theme")}
              </span>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-4 w-4" />
          {t("rootLayout.logout")}
        </Button>
      </div>
    </main>
  );
}
