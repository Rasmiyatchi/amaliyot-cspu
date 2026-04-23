import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

type HealthResponse = {
  status: string;
  version: string;
  env: string;
  timestamp: string;
};

type DbHealthResponse = {
  status: string;
  database: string;
};

export function Home() {
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
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Phase 0 — Foundation</h2>
          <p className="text-muted-foreground">
            React + Vite + TypeScript + Tailwind + shadcn/ui + TanStack Query + React Router.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">API Health</CardTitle>
          </CardHeader>
          <CardContent>
            {health.isPending && <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>}
            {health.error && (
              <p className="text-sm text-destructive">❌ {health.error.message}</p>
            )}
            {health.data && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    {health.data.status}
                  </span>
                </dd>
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-mono">{health.data.version}</dd>
                <dt className="text-muted-foreground">Environment</dt>
                <dd className="font-mono">{health.data.env}</dd>
                <dt className="text-muted-foreground">Timestamp</dt>
                <dd className="font-mono text-xs">{health.data.timestamp}</dd>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Database</CardTitle>
          </CardHeader>
          <CardContent>
            {dbHealth.isPending && <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>}
            {dbHealth.error && (
              <p className="text-sm text-destructive">❌ {dbHealth.error.message}</p>
            )}
            {dbHealth.data && (
              <div className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="font-mono">{dbHealth.data.database}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Swatch name="Primary" className="bg-primary text-primary-foreground" />
          <Swatch name="Success" className="bg-success text-success-foreground" />
          <Swatch name="Info" className="bg-info text-info-foreground" />
        </div>
      </div>
    </main>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return <div className={`rounded-lg p-4 text-sm font-medium ${className}`}>{name}</div>;
}
