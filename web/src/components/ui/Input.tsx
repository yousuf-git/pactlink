import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
}

const baseInput =
  "h-10 w-full rounded-none border border-ink/20 bg-paper px-3 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:cursor-not-allowed disabled:bg-paper-dim";

const labelClass =
  "mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft";
const errorClass = "mt-1 block font-mono text-xs text-danger";
const hintClass = "mt-1 block text-xs text-ink-faint";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & FieldProps & { prefix?: ReactNode }
>(({ label, error, hint, className, prefix, ...props }, ref) => (
  <label className="block">
    {label && <span className={labelClass}>{label}</span>}
    <span className="relative block">
      {prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-faint">
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          baseInput,
          prefix && "pl-7",
          error && "border-danger focus:border-danger focus:ring-danger",
          className
        )}
        {...props}
      />
    </span>
    {error ? (
      <span className={errorClass}>{error}</span>
    ) : hint ? (
      <span className={hintClass}>{hint}</span>
    ) : null}
  </label>
));
Input.displayName = "Input";

export const MoneyInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & FieldProps & { symbol?: string }
>(({ label, error, hint, className, symbol = "$", ...props }, ref) => (
  <label className="block">
    {label && <span className={labelClass}>{label}</span>}
    <span className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-faint">
        {symbol}
      </span>
      <input
        ref={ref}
        inputMode="decimal"
        className={cn(
          baseInput,
          "pl-7 text-right font-mono",
          error && "border-danger focus:border-danger focus:ring-danger",
          className
        )}
        {...props}
      />
    </span>
    {error && <span className={errorClass}>{error}</span>}
    {!error && hint && <span className={hintClass}>{hint}</span>}
  </label>
));
MoneyInput.displayName = "MoneyInput";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldProps
>(({ label, error, hint, className, children, ...props }, ref) => (
  <label className="block">
    {label && <span className={labelClass}>{label}</span>}
    <select
      ref={ref}
      className={cn(
        baseInput,
        "appearance-none pr-8",
        error && "border-danger focus:border-danger focus:ring-danger",
        className
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23565A61' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.6rem center",
      }}
      {...props}
    >
      {children}
    </select>
    {error && <span className={errorClass}>{error}</span>}
    {!error && hint && <span className={hintClass}>{hint}</span>}
  </label>
));
Select.displayName = "Select";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(({ label, error, hint, className, ...props }, ref) => (
  <label className="block">
    {label && <span className={labelClass}>{label}</span>}
    <textarea
      ref={ref}
      className={cn(
        baseInput,
        "h-auto min-h-[96px] resize-y py-2.5",
        error && "border-danger focus:border-danger focus:ring-danger",
        className
      )}
      {...props}
    />
    {error && <span className={errorClass}>{error}</span>}
    {!error && hint && <span className={hintClass}>{hint}</span>}
  </label>
));
Textarea.displayName = "Textarea";
