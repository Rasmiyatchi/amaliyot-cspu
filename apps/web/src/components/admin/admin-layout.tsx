import { Outlet } from "react-router-dom";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { CommandPalette } from "@/components/admin/command-palette";
import { MaintenanceGuard } from "@/components/maintenance-guard";
import { RouteTransition } from "@/components/route-transition";

export function AdminLayout() {
  return (
    <MaintenanceGuard>
      <div className="flex h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
        <CommandPalette />
      </div>
    </MaintenanceGuard>
  );
}
