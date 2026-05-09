import { HTTPError } from "ky";
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

export function ChangePasswordPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.must_change_password) return <Navigate to={landingPathFor(user.role)} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Parol kamida 6 ta belgi bo'lishi kerak");
      return;
    }
    if (newPassword === user.username) {
      toast.error("Yangi parol login bilan bir xil bo'lmasin");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Parollar mos kelmadi");
      return;
    }
    setLoading(true);
    try {
      await api.post("v1/auth/me/force-change-password", {
        json: { new_password: newPassword },
      });
      // Update store
      setUser({ ...user, must_change_password: false });
      toast.success("Parol o'zgartirildi");
      navigate(landingPathFor(user.role), { replace: true });
    } catch (err) {
      const msg = err instanceof HTTPError ? err.message : "Kutilmagan xatolik";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900 p-4">
      <div
        className="float-slow pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
      />
      <div
        className="float-slow pointer-events-none absolute -right-10 bottom-20 h-96 w-96 rounded-full bg-purple-300/20 blur-3xl"
        style={{ animationDelay: "5s" }}
      />

      <div
        className="fade-in relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-white shadow-2xl backdrop-blur-2xl"
        style={{ animationDelay: "0.05s" }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="pulse-ring absolute inset-0 rounded-full bg-amber-500/30" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-rose-600 shadow-lg ring-4 ring-amber-500/20">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Parolni o'zgartiring</h1>
          <p className="mt-2 text-sm text-slate-300">
            Birinchi kirish uchun yangi parol o'rnatish majburiy
          </p>
        </div>

        <Alert className="mb-4 border-amber-400/30 bg-amber-400/10 text-amber-100">
          <AlertDescription className="text-xs">
            Login: <strong className="font-mono">{user.username}</strong> · Hozirgi parol login
            bilan bir xil. Endi xavfsiz yangi parolni o'rnating.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-slate-200">
              Yangi parol
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                placeholder="Kamida 6 ta belgi"
                className="h-11 border-white/10 bg-white/5 pl-10 pr-10 text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-slate-200">
              Tasdiqlash
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                placeholder="Yangi parolni qaytadan kiriting"
                className="h-11 border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="h-11 w-full bg-gradient-to-r from-amber-500 to-rose-600 text-base font-medium hover:from-amber-600 hover:to-rose-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Parolni o'zgartirish
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
