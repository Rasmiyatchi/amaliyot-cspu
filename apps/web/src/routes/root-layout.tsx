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
      <header className="border-b border-border bg-background/95 backdrop-blur-xs sticky top-0 z-40">
        <div className="container mx-auto flex h-14 items-center justify-between px-3 sm:px-6">
          <Link
            to={user ? landingPathFor(user.role) : "/"}
            className="font-bold tracking-tight hover:text-primary whitespace-nowrap shrink-0 mr-1 sm:mr-2"
          >
            <span className="hidden md:inline text-base lg:text-lg">CHDPU Amaliyot Platformasi</span>
            <span className="hidden min-[380px]:inline md:hidden text-sm sm:text-base">CHDPU Amaliyot</span>
            <span className="inline min-[380px]:hidden text-sm">CHDPU</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {user && (
              <>
                <button
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-2 rounded-md px-1.5 sm:px-2 py-1 transition-colors hover:bg-muted"
                  title={t("rootLayout.myProfile")}
                >
                  <div className="hidden md:block text-right">
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
                  className="h-8 w-8 sm:h-9 sm:w-9"
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
