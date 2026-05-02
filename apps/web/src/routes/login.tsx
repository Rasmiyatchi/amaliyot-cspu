import { HTTPError } from "ky";
import { Loader2, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { MaintenanceScreen } from "@/components/maintenance-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/auth-api";
import { landingPathFor } from "@/lib/routing";
import { usePublicSettings } from "@/lib/api/system-settings";
import { useAuthStore } from "@/stores/auth";

export function Login() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: settings } = usePublicSettings();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={landingPathFor(user.role)} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(username, password);
      toast.success(`Xush kelibsiz, ${u.full_name}!`);
      navigate(landingPathFor(u.role), { replace: true });
    } catch (err) {
      const msg = err instanceof HTTPError ? err.message : "Kutilmagan xatolik";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (settings?.maintenance_mode) {
    return (
      <MaintenanceScreen
        message={settings.maintenance_message}
        siteName={settings.site_name}
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <LockKeyhole className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Tizimga kirish</CardTitle>
          <CardDescription>Login va parolingizni kiriting</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Login</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Kirish
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
