import { LogOut } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { MaintenanceGuard } from "@/components/maintenance-guard";
import { ProfileDialog } from "@/components/profile-dialog";
import { RouteTransition } from "@/components/route-transition";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { logout } from "@/lib/auth-api";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

export function RootLayout() {
  useBootstrap(); // sahifa yuklanishi bilan sessiya tiklash
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    toast.success(t("rootLayout.logoutToast"));
    navigate("/login", { replace: true });
  }

  return (
    <MaintenanceGuard>
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-14 items-center justify-between">
          <Link
            to={user ? landingPathFor(user.role) : "/"}
            className="text-lg font-semibold tracking-tight hover:text-primary"
          >
            CHDPU Amaliyot Platformasi
          </Link>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <button
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted"
                  title={t("rootLayout.myProfile")}
                >
                  <div className="hidden text-right sm:block">
                    <div className="text-sm font-medium leading-tight">{user.full_name}</div>
                    <div className="text-xs text-muted-foreground">{user.role}</div>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      user.first_name[0]
                    )}
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label={t("rootLayout.logout")}
                  title={t("rootLayout.logout")}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <RouteTransition>
        <Outlet />
      </RouteTransition>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
    </MaintenanceGuard>
  );
}
