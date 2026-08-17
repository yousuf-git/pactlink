import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Editorial custom select — replaces the default-styled native dropdown.
// Sharp corners, hairline border, animated menu, glow-marked selection.
// `tone` adapts it for light (paper) sections or dark ink panels.
export function SelectMenu({
  value,
  onChange,
  options,
  placeholder = "Select…",
  id,
  invalid = false,
  tone = "light",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  tone?: "light" | "dark";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dark = tone === "dark";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 border px-3.5 py-3 text-left font-sans text-sm transition-all focus:outline-none",
          dark
            ? cn(
                "bg-transparent focus:ring-1 focus:ring-glow",
                invalid ? "border-[#E0857E]" : open ? "border-glow ring-1 ring-glow" : "border-paper/30 hover:border-paper/55",
                value ? "text-paper" : "text-paper/40"
              )
            : cn(
                "bg-paper focus:ring-1 focus:ring-ink",
                invalid ? "border-danger" : open ? "border-ink ring-1 ring-ink" : "border-ink/20 hover:border-ink/40",
                value ? "text-ink" : "text-ink-faint"
              )
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 transition-transform duration-200",
            dark ? "text-paper/50" : "text-ink-soft",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute z-30 mt-1.5 max-h-72 w-full overflow-auto border py-1",
              dark ? "border-paper/20 bg-ink" : "border-ink/20 bg-paper"
            )}
            style={{ boxShadow: dark ? "0 24px 50px -20px rgba(0,0,0,0.5)" : "0 24px 50px -20px rgba(22,24,28,0.35)" }}
          >
            {options.map((opt) => {
              const active = opt === value;
              return (
                <li key={opt} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left font-sans text-sm transition-colors",
                      dark
                        ? active
                          ? "bg-paper/10 text-paper"
                          : "text-paper/70 hover:bg-paper/10 hover:text-paper"
                        : active
                          ? "bg-paper-dim text-ink"
                          : "text-ink-soft hover:bg-paper-dim hover:text-ink"
                    )}
                  >
                    <span className="truncate">{opt}</span>
                    {active && <Check size={14} className="shrink-0 text-glow" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
