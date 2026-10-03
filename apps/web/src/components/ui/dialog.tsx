import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type CloseOffsets = { padTop: number; padRight: number; gap: number; inset: number };

const SM_QUERY = "(min-width: 640px)";
const DEFAULT_OFFSETS: CloseOffsets = { padTop: 16, padRight: 16, gap: 12, inset: 12 };

const px = (value: string) => Number.parseFloat(value) || 0;

/**
 * Yopish (X) tugmasi. Kontent uzun bo'lib aylantirilsa ham yuqori o'ng burchakda qoladi
 * (sticky). Konteyner flex ustun bo'lgani uchun tugma `order-first` bilan vizual birinchi
 * turadi, DOM'da esa oxirida — fokus tartibi o'zgarmaydi (birinchi maydon fokus oladi).
 * Iste'molchi padding/gap'ni o'zgartirishi mumkin, shuning uchun ular o'lchab olinadi:
 * tugma har doim chegaradan 12px (sm: 16px) ichkarida turadi va joy egallamaydi.
 */
function DialogStickyClose() {
  const { t } = useTranslation();
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [offsets, setOffsets] = React.useState<CloseOffsets>(DEFAULT_OFFSETS);

  React.useLayoutEffect(() => {
    const content = anchorRef.current?.parentElement;
    if (!content) return;
    const measure = () => {
      const style = window.getComputedStyle(content);
      const next: CloseOffsets = {
        padTop: px(style.paddingTop),
        padRight: px(style.paddingRight),
        gap: px(style.rowGap),
        inset: window.matchMedia(SM_QUERY).matches ? 16 : 12,
      };
      setOffsets((prev) =>
        prev.padTop === next.padTop &&
        prev.padRight === next.padRight &&
        prev.gap === next.gap &&
        prev.inset === next.inset
          ? prev
          : next,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // `sticky top-0`: brauzer yopishish chegarasini konteynerning padding'i ichida hisoblaydi —
  // langar kontent qutisining tepasida turadi, tugma esa undan padding'ga qaytariladi.
  return (
    <div
      ref={anchorRef}
      className="pointer-events-none sticky top-0 z-10 order-first h-0"
      style={{ marginBottom: -offsets.gap }}
    >
      <DialogPrimitive.Close
        className="pointer-events-auto absolute rounded-sm bg-background/85 p-1 text-muted-foreground opacity-70 ring-offset-background backdrop-blur-sm transition-opacity hover:text-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        style={{
          top: offsets.inset - offsets.padTop,
          right: offsets.inset - offsets.padRight,
        }}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">{t("common.close")}</span>
      </DialogPrimitive.Close>
    </div>
  );
}

/**
 * Padding va gap `clamp()` bilan beriladi (sm-variantsiz): iste'molchi `p-0` / `gap-0` bersa
 * barcha ekranlarda haqiqatan bekor bo'ladi (avval `sm:p-6` o'chmay qolardi).
 * Bolalar `shrink-0` — flex ustunda ham grid'dagidek siqilmaydi.
 */
const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showClose?: boolean;
  }
>(({ className, children, showClose = true, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 flex w-[calc(100vw-1.5rem)] min-w-0 max-w-lg max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-[clamp(0.75rem,2vw,1rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border bg-background p-[clamp(1rem,2.5vw,1.5rem)] shadow-lg duration-200 sm:w-full [&>*]:shrink-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    >
      {children}
      {showClose && <DialogStickyClose />}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
