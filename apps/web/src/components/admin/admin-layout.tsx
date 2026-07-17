import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { CommandPalette } from "@/components/admin/command-palette";
import { MaintenanceGuard } from "@/components/maintenance-guard";
import { RouteTransition } from "@/components/route-transition";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function AdminLayout() {
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
        <AdminSidebar />

        {/* Mobil navigatsiya drawer */}
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="left" className="w-64 p-0" showClose={false}>
            <SheetTitle className="sr-only">{t("adminAdminLayout.navTitle")}</SheetTitle>
            <AdminSidebar inSheet />
          </SheetContent>
        </Sheet>

        {/* min-w-0 — flex bolasining default min-width:auto sababli gorizontal
            overflow bo'lishining oldini oladi (jadvallar o'z ichida scroll qiladi) */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobil header (md+ da yashirin) */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNavOpen(true)}
              aria-label={t("adminAdminLayout.menuLabel")}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-semibold">CHDPU Amaliyot</span>
          </header>

          <main className="flex-1 overflow-auto">
            <RouteTransition>
              <Outlet />
            </RouteTransition>
          </main>
        </div>
        <CommandPalette />
      </div>
    </MaintenanceGuard>
  );
}
