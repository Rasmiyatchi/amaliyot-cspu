import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  LogIn,
  MapPin,
  Package,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { usePublicSettings } from "@/lib/api/system-settings";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

const features = [
  {
    icon: CalendarCheck,
    title: "Geo-fence davomat",
    desc: "Talaba telefon GPS'i orqali check-in qiladi. Tashkilot hududidan tashqarida bo'lsa avtomatik rad etiladi.",
    accent: "from-emerald-500/20 to-teal-500/10",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: FileCheck2,
    title: "QR shartnoma",
    desc: "Bir bosishda PDF + QR kod generatsiya. Qabul qiluvchi tashkilot skanlab tekshiradi — public verify ishlaydi.",
    accent: "from-blue-500/20 to-indigo-500/10",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: ClipboardList,
    title: "Sillabus topshiriqlar",
    desc: "4+2 amaliyot sillabusidan 43 ta tayyor topshiriq. Talaba yuboradi, supervizor ball qo'yadi.",
    accent: "from-purple-500/20 to-pink-500/10",
    iconClass: "text-purple-600 dark:text-purple-400",
  },
  {
    icon: Package,
    title: "Yig'ma jild ZIP",
    desc: "Hisobot, kundalik, dars tahlillari va shartnoma — bir bosishda PDF'lar to'plami sifatida yuklab olish.",
    accent: "from-amber-500/20 to-orange-500/10",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
];

const roles = [
  {
    icon: ShieldCheck,
    label: "Super Admin",
    desc: "Tizim sozlamalari, profilaktika rejimi, adminlar boshqaruvi, davomat override",
    color: "border-purple-500/30 bg-purple-500/5",
  },
  {
    icon: Shield,
    label: "Admin",
    desc: "Talaba/supervizor/tashkilot CRUD, biriktirish, shartnoma, davomat, hisobotlar",
    color: "border-indigo-500/30 bg-indigo-500/5",
  },
  {
    icon: UserCog,
    label: "Supervizor",
    desc: "O'z talabalari davomatini tasdiqlash, topshiriqlarni baholash, kundalikni o'qish",
    color: "border-blue-500/30 bg-blue-500/5",
  },
  {
    icon: GraduationCap,
    label: "Talaba",
    desc: "Check-in/out, topshiriq submit, kundalik yozuvi, dars tahlili, yig'ma jild yuklab olish",
    color: "border-emerald-500/30 bg-emerald-500/5",
  },
];

export function Home() {
  const user = useAuthStore((s) => s.user);
  const { data: settings } = usePublicSettings();

  const siteName = settings?.site_name ?? "CHDPU Amaliyot Platformasi";
  const siteDesc = settings?.site_description;

  return (
    <div className="landing-bg relative min-h-screen overflow-hidden">
      {/* Floating blobs */}
      <div className="blob pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div
        className="blob pointer-events-none absolute -right-20 top-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
        style={{ animationDelay: "5s" }}
      />
      <div
        className="blob pointer-events-none absolute bottom-20 left-1/3 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl"
        style={{ animationDelay: "8s" }}
      />

      {/* Hero */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32">
        <div className="container mx-auto max-w-5xl px-4 text-center">
          <div
            className="fade-in mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-xs font-medium backdrop-blur-md"
            style={{ animationDelay: "0.05s" }}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">
              Chirchiq Davlat Pedagogika Universiteti
            </span>
          </div>

          <h1
            className="fade-in mb-5 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl"
            style={{ animationDelay: "0.1s" }}
          >
            {siteName}
          </h1>

          <p
            className="fade-in mx-auto mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: "0.2s" }}
          >
            {siteDesc ||
              "Talabalar amaliyotini raqamlashtirilgan zamonaviy platforma — geo-fence davomat, QR shartnomalar, sillabus topshiriqlari va yig'ma jild eksporti bilan."}
          </p>

          <div
            className="fade-in flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "0.3s" }}
          >
            {user ? (
              <Button asChild size="lg" className="gap-2">
                <Link to={landingPathFor(user.role)}>
                  Mening dashboard'im
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="gap-2">
                <Link to="/login">
                  <LogIn className="h-4 w-4" />
                  Tizimga kirish
                </Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline" className="gap-2">
              <a href="#features">
                Imkoniyatlar
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>

          {/* Stats */}
          <div className="fade-in mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4" style={{ animationDelay: "0.45s" }}>
            <Stat value="123" label="Faol talaba" />
            <Stat value="8" label="Amaliyot turi" />
            <Stat value="43" label="Sillabus topshiriqlar" />
            <Stat value="4" label="Foydalanuvchi roli" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Imkoniyatlar
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Amaliyotning butun siklini qamrab oluvchi yagona platforma — talabani
              biriktirishdan tortib, yig'ma jildgacha.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="fade-in group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 transition-opacity group-hover:opacity-100`}
                />
                <div className="relative">
                  <div
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-background/80 ${f.iconClass}`}
                  >
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 font-semibold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="relative py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              4 xil foydalanuvchi
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Har rol o'ziga xos vazifalarni bajaradi. RBAC orqali himoyalangan,
              audit yozuvlari saqlanadi.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r, i) => (
              <div
                key={r.label}
                className={`fade-in rounded-xl border p-6 transition-all hover:-translate-y-1 ${r.color}`}
                style={{ animationDelay: `${0.1 + i * 0.07}s` }}
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-background/80">
                  <r.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold">{r.label}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-card to-purple-500/10 p-10 text-center sm:p-16">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Amaliyotni boshlash uchun tayyormisiz?
            </h2>
            <p className="mx-auto mb-6 max-w-md text-muted-foreground">
              Tizimga kiring va sizning rolingizga mos dashboard ochiladi.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link to={user ? landingPathFor(user.role) : "/login"}>
                {user ? "Dashboard'ga o'tish" : "Tizimga kirish"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/50 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            Chirchiq, Toshkent viloyati
          </div>
          <div>© {new Date().getFullYear()} Chirchiq Davlat Pedagogika Universiteti</div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 px-4 py-5 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-primary to-purple-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
