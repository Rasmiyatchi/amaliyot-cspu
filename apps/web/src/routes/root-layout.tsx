import { LogOut } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { logout } from "@/lib/auth-api";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

export function RootLayout() {
  useBootstrap(); // sahifa yuklanishi bilan sessiya tiklash
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    toast.success("Tizimdan chiqildi");
    navigate("/login", { replace: true });
  }

  return (
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
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium leading-tight">{user.full_name}</div>
                  <div className="text-xs text-muted-foreground">{user.role}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Chiqish"
                  title="Chiqish"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
