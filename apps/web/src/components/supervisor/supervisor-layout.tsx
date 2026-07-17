import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";

import { MaintenanceGuard } from "@/components/maintenance-guard";
import { RouteTransition } from "@/components/route-transition";
import { SupervisorSidebar } from "@/components/supervisor/supervisor-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function SupervisorLayout() {
  const { t } = useTranslation();
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // Sahifa almashganda drawer o'zi yopilsin
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <MaintenanceGuard>
      <div className="flex h-dvh bg-background">
        {/* Desktop sidebar — mobilda `hidden md:flex` */}
        <SupervisorSidebar />

        {/* Mobil navigatsiya drawer */}
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="left" className="w-64 p-0" showClose={false}>
            <SheetTitle className="sr-only">
              {t("supervisorSupervisorLayout.navTitle")}
            </SheetTitle>
            <SupervisorSidebar inSheet />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobil header (md+ da yashirin) */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNavOpen(true)}
              aria-label={t("supervisorSupervisorLayout.menuLabel")}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-semibold">
              {t("supervisorSupervisorLayout.brand")}
            </span>
          </header>

          <main className="flex-1 overflow-auto">
            <RouteTransition>
              <Outlet />
            </RouteTransition>
          </main>
        </div>
      </div>
    </MaintenanceGuard>
  );
}
