import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

// Monochrome editorial tones: primary = solid ink; secondary = outline ink;
// ghost = soft ink with paper-dim hover; destructive = outline danger;
// success = solid ink carrying a glow accent (treated like primary).
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink text-paper hover:bg-ink/90",
  secondary:
    "border border-ink text-ink hover:bg-paper-dim",
  ghost: "text-ink-soft hover:bg-paper-dim hover:text-ink",
  destructive:
    "border border-danger text-danger hover:bg-danger/10",
  success: "bg-ink text-paper hover:bg-ink/90 border-b-2 border-glow",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      fullWidth,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-none font-grotesk font-medium transition-colors duration-150 ease-out focus-ring disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
