import { ArrowLeft, Compass, Home, MapPinOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

export function NotFound() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <div className="landing-bg relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4 py-16">
      {/* Floating blobs */}
      <div className="blob pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div
        className="blob pointer-events-none absolute -right-10 bottom-20 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
        style={{ animationDelay: "5s" }}
      />

      <div className="relative mx-auto max-w-xl text-center">
        {/* Big 404 */}
        <div className="fade-in mb-6 flex items-center justify-center gap-2">
          <span className="bg-gradient-to-br from-primary to-purple-600 bg-clip-text text-[120px] font-bold leading-none text-transparent sm:text-[160px]">
            4
          </span>
          <div className="relative flex h-[120px] w-[120px] items-center justify-center sm:h-[160px] sm:w-[160px]">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 blur-xl" />
            <Compass
              className="spin-slow relative h-20 w-20 text-primary sm:h-28 sm:w-28"
              strokeWidth={1.5}
            />
          </div>
          <span className="bg-gradient-to-br from-purple-600 to-primary bg-clip-text text-[120px] font-bold leading-none text-transparent sm:text-[160px]">
            4
          </span>
        </div>

        <div
          className="fade-in mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-xs font-medium backdrop-blur-md"
          style={{ animationDelay: "0.1s" }}
        >
          <MapPinOff className="h-3.5 w-3.5 text-muted-foreground" />
          Sahifa topilmadi
        </div>

        <h1
          className="fade-in mb-3 text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ animationDelay: "0.2s" }}
        >
          Yo'lni yo'qotdingizmi?
        </h1>

        <p
          className="fade-in mx-auto mb-8 max-w-md text-muted-foreground"
          style={{ animationDelay: "0.3s" }}
        >
          Siz qidirayotgan sahifa mavjud emas yoki ko'chirilgan. Bosh sahifaga
          qaytishingiz yoki orqaga o'tishingiz mumkin.
        </p>

        <div
          className="fade-in flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "0.4s" }}
        >
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Button>
          <Button asChild>
            <Link to={user ? landingPathFor(user.role) : "/"}>
              <Home className="h-4 w-4" />
              {user ? "Mening dashboard'im" : "Bosh sahifa"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
