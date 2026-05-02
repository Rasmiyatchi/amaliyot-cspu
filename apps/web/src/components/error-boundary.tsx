import { AlertTriangle, ArrowLeft, Home, RotateCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <ErrorScreen error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

export function ErrorScreen({
  error,
  onReset,
}: {
  error: Error;
  onReset?: () => void;
}) {
  return (
    <div className="landing-bg relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4 py-16">
      <div className="blob pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-destructive/10 blur-3xl" />
      <div
        className="blob pointer-events-none absolute -right-10 bottom-20 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl"
        style={{ animationDelay: "5s" }}
      />

      <div className="relative mx-auto max-w-xl text-center">
        <div className="fade-in relative mx-auto mb-6 h-32 w-32">
          <div className="pulse-ring absolute inset-0 rounded-full border-2 border-destructive/30" />
          <div
            className="pulse-ring absolute inset-0 rounded-full border-2 border-destructive/30"
            style={{ animationDelay: "1s" }}
          />
          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-destructive/10 backdrop-blur-sm">
            <AlertTriangle
              className="wobble h-14 w-14 text-destructive"
              style={{ animationDuration: "3s" }}
            />
          </div>
        </div>

        <div
          className="fade-in mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-4 py-1.5 text-xs font-medium text-destructive backdrop-blur-md"
          style={{ animationDelay: "0.1s" }}
        >
          Kutilmagan xatolik
        </div>

        <h1
          className="fade-in mb-3 text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ animationDelay: "0.2s" }}
        >
          Nimadir noto'g'ri ketdi
        </h1>

        <p
          className="fade-in mx-auto mb-6 max-w-md text-muted-foreground"
          style={{ animationDelay: "0.3s" }}
        >
          Ilovada kutilmagan xatolik yuz berdi. Qayta urinib ko'ring yoki bosh
          sahifaga qayting.
        </p>

        {error.message && (
          <div
            className="fade-in mx-auto mb-6 max-w-md rounded-md border border-destructive/30 bg-destructive/5 p-3 text-left text-xs"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="mb-1 font-semibold text-destructive">
              Texnik tafsilot:
            </div>
            <code className="block break-words font-mono text-muted-foreground">
              {error.message}
            </code>
          </div>
        )}

        <div
          className="fade-in flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "0.5s" }}
        >
          {onReset && (
            <Button onClick={onReset} variant="outline">
              <RotateCw className="h-4 w-4" />
              Qayta urinib ko'rish
            </Button>
          )}
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Button>
          <Button asChild>
            <Link to="/">
              <Home className="h-4 w-4" />
              Bosh sahifa
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
