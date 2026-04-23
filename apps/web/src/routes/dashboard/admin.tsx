import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";

export function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  return (
    <main className="container py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Admin Dashboard</h2>
            <p className="text-sm text-muted-foreground">Rol: {user?.role}</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Placeholder</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Phase 2+ dan boshlab bu yerda talabalar, korxonalar, amaliyotlarni boshqarish UI'si paydo bo'ladi.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
