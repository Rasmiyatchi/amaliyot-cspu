import { HTTPError } from "ky";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  User,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, logout } from "@/lib/auth-api";
import { useAuthStore } from "@/stores/auth";

export function RescuePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user?.role === "super_admin") return <Navigate to="/admin" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(username, password);
      if (u.role !== "super_admin") {
        await logout();
        toast.error("Bu sahifa faqat Super Admin uchun");
        return;
      }
      toast.success(`Xush kelibsiz, ${u.full_name}!`);
      navigate("/admin", { replace: true });
    } catch (err) {
      const msg = err instanceof HTTPError ? err.message : "Kutilmagan xatolik";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rescue-bg fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4 text-white">
      {/* Floating decorations */}
      <div
        className="float-slow pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="float-slow pointer-events-none absolute -right-20 bottom-20 h-96 w-96 rounded-full bg-rose-500/20 blur-3xl"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="float-slow pointer-events-none absolute right-1/3 top-1/2 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl"
        style={{ animationDelay: "7s" }}
      />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div
          className="fade-in rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-2xl"
          style={{ animationDelay: "0.05s" }}
        >
          {/* Header — emergency badge */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="pulse-ring absolute inset-0 rounded-full bg-amber-500/30" />
              <div
                className="pulse-ring absolute inset-0 rounded-full bg-amber-500/30"
                style={{ animationDelay: "1s" }}
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-rose-600 shadow-lg ring-4 ring-amber-500/20">
                <ShieldAlert className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
              <AlertTriangle className="h-3 w-3" />
              Maxfiy kirish
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Super Admin Rescue</h1>
            <p className="mt-2 text-sm text-slate-300">
              Faqat Super Admin loginini qabul qiladi. Profilaktika rejimida ham
              ishlaydi.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="fade-in space-y-4"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-200">
                Login
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  disabled={loading}
                  placeholder="Super Admin login"
                  className="h-11 border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-amber-500/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                Parol
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                  className="h-11 border-white/10 bg-white/5 pl-10 pr-10 text-white placeholder:text-slate-500 focus-visible:ring-amber-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  aria-label={showPassword ? "Yashirish" : "Ko'rsatish"}
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
              className="h-11 w-full bg-gradient-to-r from-amber-500 to-rose-600 text-base font-medium text-white hover:from-amber-600 hover:to-rose-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kirilmoqda...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Kirish
                </>
              )}
            </Button>

            <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-100/80">
              Bu sahifa profilaktika rejimida tizimga qayta kirish uchun. Faqat
              Super Admin foydalanuvchilari kirishi mumkin.
            </div>
          </form>
        </div>

        <div className="mt-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} CHDPU
        </div>
      </div>
    </div>
  );
}
