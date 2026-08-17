import type { BlogPost } from "@/data/blog";
import { cn } from "@/lib/utils";

// No stock photography. Each post's cover is a dark, blueprint-textured ink
// tile with its editorial icon masked into the corner at low opacity + a
// diagonal accent — the same embedded look as the featured card.
export function BlogCover({
  post,
  className,
  iconSize = 120,
}: {
  post: BlogPost;
  className?: string;
  iconSize?: number;
}) {
  const Icon = post.coverIcon;
  return (
    <div className={cn("relative isolate overflow-hidden bg-ink", className)}>
      <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 0%, transparent 60%, rgba(201,154,65,0.12) 60%, rgba(201,154,65,0.12) 62%, transparent 62%)",
        }}
      />
      <span aria-hidden className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-glow" />
      <Icon
        aria-hidden
        strokeWidth={1}
        className="pointer-events-none absolute -bottom-4 -right-3 text-paper/[0.13]"
        style={{ width: iconSize, height: iconSize }}
      />
    </div>
  );
}
