import { HTTPError } from "ky";
import { Eye, EyeOff, KeyRound, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Props = {
  currentUsername: string;
  /** Saqlash — api chaqirig'i. Muvaffaqiyatda resolved bo'ladi, xatoda reject. */
  onSave: (payload: { username?: string; password?: string }) => Promise<unknown>;
  isPending?: boolean;
};

export function CredentialsSection({ currentUsername, onSave, isPending }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(currentUsername);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const hasChange =
    (username.trim() && username.trim() !== currentUsername) || password.length >= 4;

  const reset = () => {
    setUsername(currentUsername);
    setPassword("");
    setOpen(false);
    setShowPassword(false);
  };

  const handleSave = async () => {
    const payload: { username?: string; password?: string } = {};
    const trimmed = username.trim();
    if (trimmed && trimmed !== currentUsername) {
      payload.username = trimmed;
    }
    if (password) {
      if (password.length < 4) {
        toast.error(t("adminCredentialsSection.passwordMinLength"));
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
      reset();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  return (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("adminCredentialsSection.title")}
        </h3>
        {!open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <KeyRound className="h-3.5 w-3.5" />
            {t("common.edit")}
          </Button>
        )}
      </div>

      {!open && (
        <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-1 sm:gap-2 text-sm min-w-0">
          <dt className="text-muted-foreground min-w-0 shrink-0">{t("adminCredentialsSection.usernameLabel")}</dt>
          <dd className="font-mono min-w-0 break-all">{currentUsername}</dd>
          <dt className="text-muted-foreground min-w-0 shrink-0">{t("adminCredentialsSection.passwordLabel")}</dt>
          <dd className="text-muted-foreground min-w-0">••••••••</dd>
        </div>
      )}

      {open && (
        <>
          <Alert className="border-warning/30 bg-warning/5">
            <AlertDescription className="text-xs">
              {t("adminCredentialsSection.hint")}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <Label htmlFor="cred-username">{t("adminCredentialsSection.newUsername")}</Label>
              <Input
                id="cred-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>

            <div>
              <Label htmlFor="cred-password">{t("adminCredentialsSection.newPassword")}</Label>
              <div className="relative">
                <Input
                  id="cred-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("adminCredentialsSection.passwordPlaceholder")}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? t("adminCredentialsSection.hide") : t("adminCredentialsSection.show")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChange || isPending}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Save className="h-3.5 w-3.5" />
              {t("common.save")}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset} disabled={isPending}>
              {t("common.cancel")}
            </Button>
          </div>
        </>
      )}

      <Separator />
    </div>
  );
}
