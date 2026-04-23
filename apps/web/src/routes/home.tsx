import { useQuery } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

type HealthResponse = { status: string; version: string; env: string; timestamp: string };
type DbHealthResponse = { status: string; database: string };

export function Home() {
  const user = useAuthStore((s) => s.user);

  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get("v1/health").json<HealthResponse>(),
  });

  const dbHealth = useQuery({
    queryKey: ["db-health"],
    queryFn: () => api.get("v1/db-health").json<DbHealthResponse>(),
  });

  return (
    <main className="container py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Amaliyot platformasi</h2>
            <p className="text-muted-foreground">
              Phase 1 — Auth & RBAC ishga tushdi. Login qilib o'z dashboard'ingizga o'ting.
            </p>
          </div>
          {user ? (
            <Button asChild>
              <Link to={landingPathFor(user.role)}>Dashboard</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/login">
                <LogIn className="h-4 w-4" />
                Kirish
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">API</CardTitle>
            </CardHeader>
            <CardContent>
              {health.isPending && (
                <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
              )}
              {health.error && (
                <p className="text-sm text-destructive">❌ {health.error.message}</p>
              )}
              {health.data && (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span className="font-mono">{health.data.status}</span>
                    <span className="text-muted-foreground">· v{health.data.version}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{health.data.env}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Database</CardTitle>
            </CardHeader>
            <CardContent>
              {dbHealth.isPending && (
                <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
              )}
              {dbHealth.error && (
                <p className="text-sm text-destructive">❌ {dbHealth.error.message}</p>
              )}
              {dbHealth.data && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="font-mono">{dbHealth.data.database}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
