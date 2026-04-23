import { Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";

export function SupervisorDashboard() {
  const user = useAuthStore((s) => s.user);
  return (
    <main className="container py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
            <Users className="h-5 w-5 text-info" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Supervizor Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Salom, {user?.full_name}
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Placeholder</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Phase 5+ da biriktirilgan talabalar ro'yxati, davomat tasdiqlash, topshiriqlar baholash UI'si paydo bo'ladi.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
