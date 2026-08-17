import { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SelectMenu } from "@/components/ui/SelectMenu";

// Editorial monochrome pagination. Controlled + presentational: the only
// derived state is the truncated page-number list. Sharp corners, hairlines,
// mono uppercase readout/counts, glow reserved for the active page.

interface PaginationProps {
  total: number;
  /** 1-based current page. */
  page: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  /** When provided, the "Rows" page-size control is shown. */
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

const ELLIPSIS = "ellipsis" as const;
type PageToken = number | typeof ELLIPSIS;

/**
 * Build a compact page list with truncation, e.g. 1 … 4 5 [6] 7 8 … 20.
 * Always shows first + last; a window of neighbours around the active page.
 */
function buildPageList(current: number, last: number): PageToken[] {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }

  const tokens: PageToken[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);

  if (start > 2) tokens.push(ELLIPSIS);
  for (let p = start; p <= end; p++) tokens.push(p);
  if (end < last - 1) tokens.push(ELLIPSIS);

  tokens.push(last);
  return tokens;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Return the current page slice for a list of items (1-based page). */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const safeSize = Math.max(1, pageSize);
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * safeSize;
  return items.slice(start, start + safeSize);
}

const ICON_BTN =
  "inline-flex h-9 w-9 items-center justify-center rounded-none border border-line bg-surface text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink focus-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-ink-soft";

export function Pagination({
  total,
  page,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const current = clamp(page, 1, lastPage);

  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  const pages = useMemo(
    () => buildPageList(current, lastPage),
    [current, lastPage]
  );

  // Guarded navigation — never fires outside [1, lastPage].
  const go = (target: number) => {
    const next = clamp(target, 1, lastPage);
    if (next !== current) onPageChange(next);
  };

  const atStart = current <= 1;
  const atEnd = current >= lastPage;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Left — mono count readout */}
      <p className="font-mono text-xs uppercase tracking-wider text-ink-soft tabular-nums">
        {total === 0 ? (
          "No results"
        ) : (
          <>
            Showing{" "}
            <span className="text-ink">
              {start}&ndash;{end}
            </span>{" "}
            of <span className="text-ink">{total}</span>
          </>
        )}
      </p>

      {/* Right — page-size control + navigation */}
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
              Rows
            </span>
            <SelectMenu
              value={String(pageSize)}
              onChange={(v) => onPageSizeChange(Number(v))}
              options={pageSizeOptions.map(String)}
              className="w-20"
            />
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="First page"
            disabled={atStart}
            onClick={() => go(1)}
            className={ICON_BTN}
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Previous page"
            disabled={atStart}
            onClick={() => go(current - 1)}
            className={ICON_BTN}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page-number row (truncated) */}
          <div className="mx-1 flex items-center gap-1">
            {pages.map((token, i) =>
              token === ELLIPSIS ? (
                <span
                  key={`gap-${i}`}
                  aria-hidden="true"
                  className="px-1 font-mono text-xs text-ink-faint"
                >
                  &hellip;
                </span>
              ) : (
                <button
                  key={token}
                  type="button"
                  aria-label={`Page ${token}`}
                  aria-current={token === current ? "page" : undefined}
                  onClick={() => go(token)}
                  className={cn(
                    "inline-flex h-9 min-w-9 items-center justify-center rounded-none border px-2 font-mono text-xs tabular-nums transition-colors focus-ring",
                    token === current
                      ? "border-ink bg-ink text-paper"
                      : "border-line bg-surface text-ink-soft hover:bg-paper-dim hover:text-ink"
                  )}
                >
                  {token}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            aria-label="Next page"
            disabled={atEnd}
            onClick={() => go(current + 1)}
            className={ICON_BTN}
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            aria-label="Last page"
            disabled={atEnd}
            onClick={() => go(lastPage)}
            className={ICON_BTN}
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
