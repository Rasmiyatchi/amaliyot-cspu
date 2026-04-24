import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  variant?: "default" | "destructive";
  isPending?: boolean;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export function PromptDialog({
  open,
  title,
  description,
  label = "Sabab",
  placeholder,
  confirmText = "Tasdiqlash",
  cancelText = "Bekor",
  minLength = 3,
  maxLength = 2000,
  rows = 3,
  variant = "default",
  isPending,
  onConfirm,
  onClose,
}: Props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      toast.error(`Kamida ${minLength} belgi kerak`);
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div>
          <Label htmlFor="prompt-value">{label}</Label>
          <textarea
            id="prompt-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={rows}
            maxLength={maxLength}
            placeholder={placeholder}
            className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            autoFocus
          />
          <div className="mt-1 text-right text-xs text-muted-foreground">
            {value.length} / {maxLength}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isPending || value.trim().length < minLength}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
