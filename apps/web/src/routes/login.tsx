import { HTTPError } from "ky";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldAlert,
  User,
} from "lucide-react";
import type { TFunction } from "i18next";
import { useState, type FormEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/auth-api";
import { postLoginPath } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

type LoginErrorKind = "inline" | "blocked";

type LoginError = {
  kind: LoginErrorKind;
  message: string;
  /** Qo'shimcha yo'riqnoma (403 — qurilma/hisob bloklangan) */
  help?: string;
};

/** ky `beforeError` detail'ni `message`ga yozadi; yozmagan bo'lsa ky'ning standart matni qoladi. */
function serverDetail(err: HTTPError): string | null {
  const msg = err.message?.trim();
  if (!msg || /^Request failed with status/i.test(msg)) return null;
  return msg;
}

function mapLoginError(err: unknown, t: TFunction): LoginError {
  if (!(err instanceof HTTPError)) {
    return { kind: "inline", message: t("auth.login.networkError") };
  }

  const status = err.response.status;
  const detail = serverDetail(err);

  if (status === 401) {
    return {
      kind: "inline",
      message: detail ?? t("auth.login.invalidCredentials"),
    };
  }

  if (status === 403) {
    const isDeviceIssue = detail ? /qurilma|устройств|device/i.test(detail) : true;
    return {
      kind: "blocked",
      message: detail ?? t("auth.login.forbidden"),
      help: isDeviceIssue ? t("auth.login.deviceHelp") : t("auth.login.blockedHelp"),
    };
  }

  if (status === 422) {
    return {
      kind: "inline",
      message: `${t("auth.login.validation")} ${t("auth.login.validationHints")}`,
    };
  }

  // Kirish cheklangan — MaintenanceGuard to'liq ekranni ko'rsatadi, bu matn zaxira
  if (status === 423) {
    return { kind: "blocked", message: detail ?? t("auth.login.restricted") };
  }

  if (status === 429) {
    return {
      kind: "inline",
      message: detail ?? t("auth.login.tooManyAttempts"),
    };
  }

  if (status >= 500) {
    return {
      kind: "inline",
      message: t("auth.login.serverError"),
    };
  }

  return { kind: "inline", message: detail ?? t("common.unexpectedError") };
}

export function Login() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  // Profilaktika rejimi: RootLayout'dagi MaintenanceGuard bu sahifani ham yopadi;
  // Super Admin uchun MaintenanceScreen'da /rescue havolasi bor.
  if (user) {
    if (user.must_change_password) {
      return <Navigate to="/change-password" replace />;
    }
    // Sessiya tugab login'ga yo'naltirilgan bo'lsa — o'sha sahifaga qaytaramiz
    return <Navigate to={postLoginPath(user.role, location.state)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const u = await login(username.trim(), password);
      toast.success(t("auth.login.welcome", { name: u.full_name }));
      if (u.must_change_password) {
        navigate("/change-password", { replace: true });
      } else {
        navigate(postLoginPath(u.role, location.state), { replace: true });
      }
    } catch (err) {
      const mapped = mapLoginError(err, t);
      setError(mapped);
      toast.error(mapped.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      {/* Left side — Evolve Brand panel */}
      <section className="login-brand">
        <div className="login-grid" />
        <div className="flex items-center justify-between">
          <Link to="/" className="back-link">
            <ArrowLeft /> {t("auth.login.backHome")}
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="login-brand-copy">
          <img src="/chdpu-logo.png" alt="CHDPU" />
          <span className="login-kicker">{t("auth.login.brand.kicker")}</span>
          <h1>
            <Trans
              i18nKey="auth.login.brand.headline"
              components={{ br: <br />, em: <em /> }}
            />
          </h1>
          <p>{t("auth.login.brand.description")}</p>
        </div>

        <div className="login-metric">
          <strong>{t("auth.login.brand.metricValue")}</strong>
          <span>
            {t("auth.login.brand.metricTheory")}
            <br />
            {t("auth.login.brand.metricPractice")}
          </span>
        </div>
      </section>

      {/* Right side — Form panel */}
      <section className="login-panel relative">
        <div className="absolute top-4 right-4 hidden lg:flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="login-box">
          <span className="section-index">{t("auth.login.secureIndex")}</span>
          <h2>{t("auth.login.title")}</h2>
          <p>{t("auth.login.subtitle")}</p>

          <form onSubmit={handleSubmit} noValidate>
            <label>
              {t("auth.login.username")}
              <div>
                <User />
                <input
                  type="text"
                  name="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setUsername((v) => v.trim())}
                  placeholder={t("auth.login.usernamePlaceholder")}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  disabled={loading}
                />
              </div>
            </label>

            <label>
              {t("auth.login.password")}
              <div>
                <LockKeyhole />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.login.passwordPlaceholder")}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("auth.login.hide") : t("auth.login.show")}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>

            {error?.kind === "blocked" && (
              <Alert variant="destructive" className="text-left">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>{t("auth.login.blockedTitle")}</AlertTitle>
                {/* Alert'ning o'zi role="alert" — ichkarida takrorlansa ekran o'qigich ikki marta o'qiydi */}
                <AlertDescription className="space-y-1">
                  <p>{error.message}</p>
                  {error.help && <p className="text-xs opacity-90">{error.help}</p>}
                </AlertDescription>
              </Alert>
            )}

            {error?.kind === "inline" && (
              <p className="form-message" role="alert">
                {error.message}
              </p>
            )}

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? t("auth.login.submitting") : t("auth.login.submit")} <ArrowRight />
            </Button>
          </form>

          <small className="secure-note">
            <LockKeyhole aria-hidden="true" /> {t("auth.login.secureNote")}
          </small>
        </div>
      </section>
    </main>
  );
}
