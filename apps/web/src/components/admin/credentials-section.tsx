import { HTTPError } from "ky";
import { Eye, EyeOff, KeyRound, Loader2, Save } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Backend `CredentialsUpdate`: username 3..64, password 6..128 */
const USERNAME_MIN = 3;
const PASSWORD_MIN = 6;

type Props = {
  currentUsername: string;
  /** Saqlash — api chaqirig'i. Muvaffaqiyatda resolved bo'ladi, xatoda reject. */
  onSave: (payload: { username?: string; password?: string }) => Promise<unknown>;
  isPending?: boolean;
};

export function CredentialsSection({ currentUsername, onSave, isPending }: Props) {
  const { t } = useTranslation();
  const usernameId = useId();
  const passwordId = useId();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(currentUsername);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const trimmed = username.trim();
  const usernameChanged = trimmed !== "" && trimmed !== currentUsername;
  const hasChange = usernameChanged || password.length > 0;

  const startEditing = () => {
    // Har safar joriy (yangilangan) login bilan boshlanadi — eski qiymat qaytarib yuborilmasin
    setUsername(currentUsername);
    setPassword("");
    setShowPassword(false);
    setOpen(true);
  };

  const close = () => {
    setPassword("");
    setShowPassword(false);
    setOpen(false);
  };

  const handleSave = async () => {
    const payload: { username?: string; password?: string } = {};
    if (usernameChanged) {
      if (trimmed.length < USERNAME_MIN) {
        toast.error(t("adminCredentialsSection.usernameMinLength", { n: USERNAME_MIN }));
        return;
      }
      payload.username = trimmed;
    }
    if (password) {
      if (password.length < PASSWORD_MIN) {
        toast.error(t("adminCredentialsSection.passwordMinLengthN", { n: PASSWORD_MIN }));
        return;
      }
      payload.password = password;
    }
    if (!payload.username && !payload.password) {
      toast.error(t("adminCredentialsSection.noChanges"));
      return;
    }
    try {
      await onSave(payload);
      toast.success(t("adminCredentialsSection.credentialsUpdated"));
      close();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("adminCredentialsSection.title")}
        </h3>
        {!open && (
          <Button type="button" size="sm" variant="outline" onClick={startEditing}>
            <KeyRound className="h-3.5 w-3.5" />
            {t("common.edit")}
          </Button>
        )}
      </div>

      {!open && (
        <dl className="grid min-w-0 grid-cols-1 gap-1 text-sm sm:grid-cols-[130px_1fr] sm:gap-2">
          <dt className="min-w-0 shrink-0 text-muted-foreground">
            {t("adminCredentialsSection.usernameLabel")}
          </dt>
          <dd className="min-w-0 break-all font-mono">{currentUsername}</dd>
          <dt className="min-w-0 shrink-0 text-muted-foreground">
            {t("adminCredentialsSection.passwordLabel")}
          </dt>
          <dd className="min-w-0 text-muted-foreground">••••••••</dd>
        </dl>
      )}

      {open && (
        <>
          <Alert variant="warning">
            <AlertDescription className="text-xs">
              {t("adminCredentialsSection.hint")}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={usernameId}>{t("adminCredentialsSection.newUsername")}</Label>
              <Input
                id={usernameId}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={passwordId}>{t("adminCredentialsSection.newPassword")}</Label>
              <div className="relative">
                <Input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("adminCredentialsSection.passwordPlaceholder")}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={
                    showPassword
                      ? t("adminCredentialsSection.hide")
                      : t("adminCredentialsSection.show")
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!hasChange || isPending}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {t("common.save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={close} disabled={isPending}>
              {t("common.cancel")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
