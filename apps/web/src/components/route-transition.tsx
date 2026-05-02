import { useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

/** Outlet wrapper — sahifa o'zgarishida fade-in animatsiyasi qiladi.
 *
 * `key={pathname}` bilan div qayta-mount bo'ladi va route-enter klass
 * animatsiyasi har safar ishlaydi.
 */
export function RouteTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const location = useLocation();
  return (
    <div key={location.pathname} className={cn("route-enter", className)}>
      {children}
    </div>
  );
}
