import { HTTPError } from "ky";
import { Eye, EyeOff, KeyRound, Loader2, Save } from "lucide-react";
import { useState } from "react";
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
        toast.error("Parol kamida 4 belgi bo'lishi kerak");
        return;
      }
      payload.password = password;
    }
    if (!payload.username && !payload.password) {
      toast.error("O'zgartirish yo'q");
      return;
    }
    try {
      await onSave(payload);
      toast.success("Credentials yangilandi");
      reset();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Login va parol
        </h3>
        {!open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <KeyRound className="h-3.5 w-3.5" />
            Tahrirlash
          </Button>
        )}
      </div>

      {!open && (
        <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
          <dt className="text-muted-foreground">Username</dt>
          <dd className="font-mono">{currentUsername}</dd>
          <dt className="text-muted-foreground">Parol</dt>
          <dd className="text-muted-foreground">••••••••</dd>
        </div>
      )}

      {open && (
        <>
          <Alert className="border-warning/30 bg-warning/5">
            <AlertDescription className="text-xs">
              Faqat o'zgartirmoqchi bo'lgan maydonni to'ldiring. Bo'sh parol — eskisi
              saqlanadi.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <Label htmlFor="cred-username">Yangi username</Label>
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
              <Label htmlFor="cred-password">Yangi parol</Label>
              <div className="relative">
                <Input
                  id="cred-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Bo'sh qoldirsangiz eski parol qoladi"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Yashirish" : "Ko'rsatish"}
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
              Saqlash
            </Button>
            <Button size="sm" variant="ghost" onClick={reset} disabled={isPending}>
              Bekor
            </Button>
          </div>
        </>
      )}

      <Separator />
    </div>
  );
}
