import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-muted-foreground">Sahifa topilmadi</p>
      <Button asChild>
        <Link to="/">Bosh sahifaga qaytish</Link>
      </Button>
    </div>
  );
}
