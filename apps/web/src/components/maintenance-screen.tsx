import { Cog, Settings2, Sparkles, Wrench } from "lucide-react";

import { useAuthStore } from "@/stores/auth";

type Props = {
  message?: string | null;
  siteName?: string;
};

export function MaintenanceScreen({ message, siteName = "CHDPU Amaliyot" }: Props) {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="maintenance-bg fixed inset-0 z-[100] flex items-center justify-center overflow-hidden text-white">
      {/* Floating orbs (background decoration) */}
      <div
        className="float-slow pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="float-slow pointer-events-none absolute right-10 top-1/3 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"
        style={{ animationDelay: "3s" }}
      />
      <div
        className="float-slow pointer-events-none absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"
        style={{ animationDelay: "6s" }}
      />

      {/* Sparkles */}
      {[...Array(15)].map((_, i) => (
        <Sparkles
          key={i}
          className="pointer-events-none absolute text-white/30"
          style={{
            top: `${(i * 13 + 7) % 100}%`,
            left: `${(i * 17 + 11) % 100}%`,
            width: `${8 + (i % 3) * 4}px`,
            height: `${8 + (i % 3) * 4}px`,
            animation: `pulse-ring ${2 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative mx-4 max-w-xl text-center">
        {/* Animated gear cluster */}
        <div className="relative mx-auto mb-10 h-40 w-40">
          {/* Pulse rings */}
          <div className="pulse-ring absolute inset-0 rounded-full border-2 border-white/30" />
          <div
            className="pulse-ring absolute inset-0 rounded-full border-2 border-white/30"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="pulse-ring absolute inset-0 rounded-full border-2 border-white/30"
            style={{ animationDelay: "2s" }}
          />

          {/* Glass disc */}
          <div className="absolute inset-2 rounded-full bg-white/10 backdrop-blur-sm shadow-2xl" />

          {/* Big rotating gear */}
          <Cog className="spin-slow absolute inset-4 h-32 w-32 text-white/90 drop-shadow-lg" />

          {/* Smaller counter-rotating gear */}
          <Cog
            className="spin-reverse-slow absolute right-0 top-0 h-12 w-12 text-purple-200/80 drop-shadow"
            style={{ transform: "translate(20%, -20%)" }}
          />
          <Settings2
            className="spin-slow absolute bottom-0 left-0 h-10 w-10 text-blue-200/80 drop-shadow"
            style={{ transform: "translate(-20%, 20%)", animationDuration: "10s" }}
          />

          {/* Wrench overlay */}
          <Wrench className="wobble absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-lg" />
        </div>

        {/* Site name pill */}
        <div
          className="fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur-md"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          {siteName}
        </div>

        <h1
          className="fade-up mb-3 text-4xl font-bold tracking-tight sm:text-5xl"
          style={{ animationDelay: "0.2s" }}
        >
          Profilaktika rejimi
        </h1>

        <p
          className="fade-up mx-auto max-w-md text-base leading-relaxed text-blue-100"
          style={{ animationDelay: "0.4s" }}
        >
          {message ||
            "Tizim hozircha vaqtinchalik mavjud emas. Biz uni yangilamoqdamiz va tezda qaytamiz."}
        </p>

        {/* Progress hint */}
        <div
          className="fade-up mt-8 inline-flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-xs backdrop-blur-md"
          style={{ animationDelay: "0.6s" }}
        >
          <div className="flex gap-1">
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-white"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-white"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-white"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-white/80">Yangilash davom etmoqda</span>
        </div>

        {user && (
          <div
            className="fade-up mt-6 text-xs text-white/60"
            style={{ animationDelay: "0.8s" }}
          >
            {user.full_name} sifatida kirilgan
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="absolute inset-x-0 bottom-6 text-center">
        <div className="text-[10px] uppercase tracking-widest text-white/40">
          Chirchiq Davlat Pedagogika Universiteti
        </div>
      </div>
    </div>
  );
}
