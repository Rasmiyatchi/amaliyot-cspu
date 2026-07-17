import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  label,
  placeholder,
  confirmText,
  cancelText,
  minLength = 3,
  maxLength = 2000,
  rows = 3,
  variant = "default",
  isPending,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      toast.error(t("uiPromptDialog.minLengthError", { n: minLength }));
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
          <Label htmlFor="prompt-value">{label ?? t("uiPromptDialog.reasonLabel")}</Label>
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
            {cancelText ?? t("common.cancel")}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isPending || value.trim().length < minLength}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText ?? t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
