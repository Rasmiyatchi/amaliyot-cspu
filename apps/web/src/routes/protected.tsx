import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useBootstrap } from "@/hooks/use-bootstrap";
import { useAuthStore, type UserRole } from "@/stores/auth";

type Props = { allowed?: UserRole[] };

/**
 * Faqat auth'langan foydalanuvchilar uchun route wrapper.
 * `allowed` berilmasa — barcha rollar kiradi.
 * Berilsa — faqat ro'yxatdagi rollar.
 */
export function Protected({ allowed }: Props) {
  const { isReady } = useBootstrap();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
