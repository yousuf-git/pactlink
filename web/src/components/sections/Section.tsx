import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Scroll-revealed section wrapper. One varied reveal, not a canned fade on
// everything (anti-AI-slop).
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && (
        <p
          className={cn(
            "mb-4 flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft",
            align === "center" && "justify-center"
          )}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
          {eyebrow}
        </p>
      )}
      <h2 className="font-headline text-[2.05rem] font-bold leading-[1.02] tracking-[-0.025em] text-ink sm:text-[2.6rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 max-w-xl font-sans text-lg leading-relaxed text-ink-soft">{subtitle}</p>
      )}
    </div>
  );
}
