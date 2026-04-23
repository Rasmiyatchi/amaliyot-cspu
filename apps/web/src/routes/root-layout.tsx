import { Outlet } from "react-router-dom";

import { ThemeToggle } from "@/components/theme-toggle";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">CHDPU Amaliyot Platformasi</h1>
          <ThemeToggle />
        </div>
      </header>

      <Outlet />
    </div>
  );
}
