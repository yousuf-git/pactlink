import { cn } from "@/lib/utils";

// Single source for the PactLink identity: the "PactLink." wordmark set in
// Bricolage Grotesque with the terminating dot in the glow accent. Every
// surface (navbar, sign-in panels, sidebars, footer, README, favicon) uses it.

export function Logo({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "paper";
}) {
  return (
    <span
      className={cn(
        "font-headline text-xl font-bold leading-none tracking-[-0.03em]",
        tone === "paper" ? "text-paper" : "text-ink",
        className
      )}
    >
      PactLink<span className="text-glow">.</span>
    </span>
  );
}

// Short form of the wordmark — the same "P." typography as the favicon, with the
// glyphs outlined to paths so the mark is identical wherever the webfont is not
// available. `tone` names the tile, so "paper" is the variant for dark surfaces.
export function Mark({
  size = 28,
  tone = "ink",
  className,
}: {
  size?: number;
  tone?: "ink" | "paper";
  className?: string;
}) {
  const tile = tone === "paper" ? "#F2F0EB" : "#16181C";
  const glyph = tone === "paper" ? "#16181C" : "#F2F0EB";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="64" height="64" rx="14" fill={tile} />
      <g transform="translate(6.4 50.6) scale(0.05758)">
        <path
          fill={glyph}
          d="M174 -186V-299H325Q397 -299 433 -328.5Q469 -358 469 -426Q469 -486 435.5 -517.5Q402 -549 332 -549H174V-660H336Q400 -660 451.5 -645Q503 -630 539.5 -600.5Q576 -571 595 -526.5Q614 -482 614 -422Q614 -345 579 -292.5Q544 -240 475.5 -213Q407 -186 305 -186ZM73 0V-660H217V0Z"
        />
        <path
          fill="#C99A4B"
          d="M722 13Q675 13 651.5 -7Q628 -27 628 -69Q628 -112 651.5 -132Q675 -152 722 -152Q770 -152 793.5 -132Q817 -112 817 -69Q817 13 722 13Z"
        />
      </g>
    </svg>
  );
}
