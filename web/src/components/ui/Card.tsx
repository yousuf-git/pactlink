import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-none border border-line bg-surface",
        hover && "transition-colors duration-150 hover:bg-paper-dim",
        className
      )}
      style={{ boxShadow: "0 1px 2px rgba(22,24,28,0.05)" }}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-line px-5 py-4",
        className
      )}
    >
      <div>
        <h3 className="font-headline text-lg font-semibold text-ink">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-sm text-ink-soft">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
