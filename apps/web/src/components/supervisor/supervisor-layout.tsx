import { Outlet } from "react-router-dom";

import { MaintenanceGuard } from "@/components/maintenance-guard";
import { RouteTransition } from "@/components/route-transition";
import { SupervisorSidebar } from "@/components/supervisor/supervisor-sidebar";

export function SupervisorLayout() {
  return (
    <MaintenanceGuard>
      <div className="flex h-screen bg-background">
        <SupervisorSidebar />
        <main className="flex-1 overflow-auto">
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
      </div>
    </MaintenanceGuard>
  );
}
