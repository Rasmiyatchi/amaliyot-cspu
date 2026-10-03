import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore, type UserRole } from "@/stores/auth";

type Props = {
  allowed?: UserRole[];
  permission?: string;
  allowedPermissions?: string[];
};

/**
 * Faqat auth'langan va ruxsati bor foydalanuvchilar uchun route wrapper.
 * `allowed`: Ruxsat etilgan rollar
 * `permission` / `allowedPermissions`: Admin uchun modul ruxsati (RBAC)
 */
export function Protected({ allowed, permission, allowedPermissions }: Props) {
  const { t } = useTranslation();
  const { isReady } = useBootstrap();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-label={t("common.loading")}
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Birinchi kirishdagi majburiy parol almashtirish — backend ham boshqa endpointlarni 403 qiladi
  if (user.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // Boshqa rol bo'limi — foydalanuvchini o'z kabinetiga qaytaramiz
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to={landingPathFor(user.role)} replace />;
  }

  // Modul darajasidagi ruxsatlarni tekshirish (Admin roli uchun)
  if (user.role === "admin") {
    const required = allowedPermissions || (permission ? [permission] : []);
    if (required.length > 0) {
      const userPerms = user.permissions || [];
      const hasPerm = required.some((p) => {
        if (userPerms.includes(p)) return true;
        // Shartnomalarga kirish huquqi 'practice' ruxsati orqali ham beriladi
        if (p === "contracts" && userPerms.includes("practice")) return true;
        return false;
      });

      if (!hasPerm) {
        return (
          <div className="container flex min-h-[65vh] flex-col items-center justify-center py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4 shadow-xs">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("protectedRoute.forbiddenTitle")}
            </h1>
            <p className="mt-2.5 max-w-md text-sm text-muted-foreground leading-relaxed">
              {t("protectedRoute.forbiddenDescription")}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button asChild variant="default">
                <Link to="/admin">
                  <ArrowLeft className="h-4 w-4" />
                  {t("protectedRoute.backToDashboard")}
                </Link>
              </Button>
            </div>
          </div>
        );
      }
    }
  }

  return <Outlet />;
}
