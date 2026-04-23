import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";

export function AdminHome() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Admin paneli</h1>
          <p className="text-sm text-muted-foreground">Salom, {user?.full_name}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Talabalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">—</div>
            <CardDescription className="mt-1">Phase 2: import + ro'yxat</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Amaliyotda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">—</div>
            <CardDescription className="mt-1">Phase 5+ da ulanadi</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Shartnomalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">—</div>
            <CardDescription className="mt-1">Phase 6 da ulanadi</CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
