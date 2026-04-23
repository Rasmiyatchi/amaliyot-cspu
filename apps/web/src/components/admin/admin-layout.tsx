import { Outlet } from "react-router-dom";

import { AdminSidebar } from "@/components/admin/admin-sidebar";

export function AdminLayout() {
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
