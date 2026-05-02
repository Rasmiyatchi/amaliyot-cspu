import type { ReactNode } from "react";

import { MaintenanceScreen } from "@/components/maintenance-screen";
import { usePublicSettings } from "@/lib/api/system-settings";
import { useAuthStore } from "@/stores/auth";

/**
 * Maintenance guard — agar profilaktika rejimi yoqilgan bo'lsa va
 * foydalanuvchi super_admin bo'lmasa — maintenance ekranini ko'rsatadi.
 *
 * Public settings 60s da polling qilinadi (usePublicSettings ichida).
 */
export function MaintenanceGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const { data: settings } = usePublicSettings();

  const isSuperAdmin = user?.role === "super_admin";

  if (settings?.maintenance_mode && !isSuperAdmin) {
    return (
      <MaintenanceScreen
        message={settings.maintenance_message}
        siteName={settings.site_name}
      />
    );
  }

  return <>{children}</>;
}
