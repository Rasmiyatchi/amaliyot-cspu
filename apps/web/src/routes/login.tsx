import { HTTPError } from "ky";
import {
  ArrowLeft,
  CalendarCheck,
  Eye,
  EyeOff,
  FileCheck2,
  GraduationCap,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { LanguageSwitcher } from "@/components/language-switcher";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/auth-api";
import { landingPathFor } from "@/lib/routing";
import { usePublicSettings } from "@/lib/api/system-settings";
import { useAuthStore } from "@/stores/auth";

export function Login() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: settings } = usePublicSettings();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) {
    if (user.must_change_password) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to={landingPathFor(user.role)} replace />;
  }

  if (settings?.maintenance_mode) {
    return (
      <MaintenanceScreen
        message={settings.maintenance_message}
        siteName={settings.site_name}
      />
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(username, password);
      toast.success(t("auth.login.welcome", { name: u.full_name }));
      if (u.must_change_password) {
        navigate("/change-password", { replace: true });
      } else {
        navigate(landingPathFor(u.role), { replace: true });
      }
    } catch (err) {
      const msg = err instanceof HTTPError ? err.message : t("common.unexpectedError");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const siteName = settings?.site_name ?? "CHDPU Amaliyot Platformasi";

  return (
    <div className="fixed inset-0 grid grid-cols-1 lg:grid-cols-2">
      {/* Left side — branded gradient with floating elements */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900 lg:flex">
        {/* Floating blobs */}
        <div className="blob pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div
          className="blob pointer-events-none absolute right-10 top-1/2 h-96 w-96 rounded-full bg-purple-300/20 blur-3xl"
          style={{ animationDelay: "5s" }}
        />
        <div
          className="blob pointer-events-none absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl"
          style={{ animationDelay: "8s" }}
        />

        {/* Floating feature icons (decorative) */}
        <FloatingIcon
          Icon={CalendarCheck}
          className="left-[12%] top-[20%]"
          delay="0s"
        />
        <FloatingIcon
          Icon={FileCheck2}
          className="right-[18%] top-[35%]"
          delay="1.2s"
        />
        <FloatingIcon
          Icon={GraduationCap}
          className="left-[20%] bottom-[28%]"
          delay="2.5s"
        />
        <FloatingIcon
          Icon={ShieldCheck}
          className="right-[12%] bottom-[18%]"
          delay="3.8s"
        />

        {/* Content */}
        <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white">
          <Link to="/" className="inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100">
            <ArrowLeft className="h-4 w-4" />
            {t("auth.login.backHome")}
          </Link>

          <div className="fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              CHDPU
            </div>
            <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              {siteName}
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-indigo-100">
              {t("auth.login.heroText")}
            </p>
          </div>

          <div className="text-xs text-white/50">
            {t("auth.login.copyright", { year: new Date().getFullYear() })}
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="relative flex flex-col bg-background">
        {/* Top bar (theme toggle + back link on mobile) */}
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("auth.login.backShort")}
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        {/* Form center */}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <div
              className="fade-in mb-8 text-center lg:text-left"
              style={{ animationDelay: "0.05s" }}
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-primary-foreground shadow-lg">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t("auth.login.title")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("auth.login.subtitle")}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="fade-in space-y-4"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="space-y-2">
                <Label htmlFor="username">{t("auth.login.username")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    disabled={loading}
                    placeholder={t("auth.login.usernamePlaceholder")}
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.login.password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={4}
                    disabled={loading}
                    placeholder="••••••••"
                    className="h-11 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? t("auth.login.hide") : t("auth.login.show")}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full text-base font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("auth.login.submitting")}
                  </>
                ) : (
                  t("auth.login.submit")
                )}
              </Button>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                <Trans
                  i18nKey="auth.login.studentHint"
                  components={[<strong key="0" className="text-foreground" />]}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingIcon({
  Icon,
  className,
  delay,
}: {
  Icon: typeof CalendarCheck;
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={`float-slow pointer-events-none absolute flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md ${className ?? ""}`}
      style={{ animationDelay: delay }}
    >
      <Icon className="h-5 w-5 text-white/80" />
    </div>
  );
}
