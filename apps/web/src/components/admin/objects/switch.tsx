import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/**
 * Yoqish/o'chirish tugmasi (role="switch"). `FormControl` ichida ishlatilsa id va
 * aria-describedby avtomatik keladi; `<Label htmlFor>` bosilganda ham almashadi.
 */
export const Switch = forwardRef<HTMLButtonElement, Props>(
  ({ checked, onCheckedChange, className, disabled, onClick, ...props }, ref) => {
    const state = checked ? "checked" : "unchecked";
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={state}
        disabled={disabled}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) onCheckedChange(!checked);
        }}
        className={cn(
          "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
          className,
        )}
        {...props}
      >
        <span
          data-state={state}
          className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-md ring-0 transition-transform dark:bg-foreground data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        />
      </button>
    );
  },
);
Switch.displayName = "Switch";
