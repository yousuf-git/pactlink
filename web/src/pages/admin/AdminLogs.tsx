import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ScrollText, Terminal, X } from "lucide-react";
import { PageHeader, Panel, CARD_SHADOW } from "@/components/dashboard/Shared";
import { Drawer } from "@/components/ui/Drawer";
import { CopyMono, LoadingBlock, EmptyState } from "@/components/ui/Misc";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { useAsync } from "@/hooks/useAsync";
import { listAuditLogs, listPlatformUsers } from "@/services/adminApi";
import { cn, formatDate } from "@/lib/utils";
import type { AuditLogEntry, AuditCategory, AuditSeverity } from "@/lib/types";

const PAGE_SIZE = 25;

// ── Severity → terminal marker + emphasis (info=ink-faint, warning=glow, error=danger) ──
const SEVERITY: Record<
  AuditSeverity,
  { dot: string; rowTint: string; label: string }
> = {
  info: { dot: "bg-ink-faint", rowTint: "", label: "info" },
  warning: { dot: "bg-glow", rowTint: "", label: "warning" },
  error: { dot: "bg-danger", rowTint: "bg-danger/[0.04]", label: "error" },
};

const CATEGORIES: AuditCategory[] = [
  "auth",
  "quote",
  "payment",
  "webhook",
  "account",
  "admin",
];

type CategoryFilter = "all" | AuditCategory;
type SeverityFilter = "all" | AuditSeverity;

// Local midnight cutoff for the "today" stat.
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function AdminLogs() {
  const { data: logs, loading } = useAsync(() => listAuditLogs(), []);
  const { data: owners } = useAsync(listPlatformUsers, []);
  const [params, setParams] = useSearchParams();
  const userFilter = params.get("user");

  const [active, setActive] = useState<AuditLogEntry | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [page, setPage] = useState(1);

  const all = logs ?? [];

  // Resolve ?user=<tenantId> → { email, label }. Logs are keyed on actor email
  // (the tenant's owner) or target id, so we filter by either match.
  const filteredUser = useMemo(() => {
    if (!userFilter) return null;
    const o = (owners ?? []).find((u) => u._id === userFilter);
    if (!o) return { id: userFilter, email: null as string | null, label: userFilter };
    return { id: o._id, email: o.email, label: o.businessName || o.name };
  }, [owners, userFilter]);

  const clearUserFilter = () => {
    const next = new URLSearchParams(params);
    next.delete("user");
    setParams(next, { replace: true });
    setPage(1);
  };

  // ── Stat strip: total, warnings, errors, today ──
  const stats = useMemo(() => {
    const cutoff = startOfToday();
    return {
      total: all.length,
      warnings: all.filter((e) => e.severity === "warning").length,
      errors: all.filter((e) => e.severity === "error").length,
      today: all.filter((e) => new Date(e.ts).getTime() >= cutoff).length,
    };
  }, [all]);

  // ── Per-category counts for the filter pills ──
  const categoryCounts = useMemo(() => {
    const counts: Record<AuditCategory, number> = {
      auth: 0,
      quote: 0,
      payment: 0,
      webhook: 0,
      account: 0,
      admin: 0,
    };
    for (const e of all) counts[e.category] += 1;
    return counts;
  }, [all]);

  // ── Filter pipeline: tenant → category → severity → search ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      if (filteredUser) {
        // Match the tenant by actor email OR target id.
        const byActor = filteredUser.email !== null && e.actor === filteredUser.email;
        const byTarget = e.target === filteredUser.id;
        if (!byActor && !byTarget) return false;
      }
      if (category !== "all" && e.category !== category) return false;
      if (severity !== "all" && e.severity !== severity) return false;
      if (q) {
        const hay = `${e.actor} ${e.action} ${e.target ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, filteredUser, category, severity, query]);

  // Reset to page 1 when the filtered set changes shape.
  useEffect(() => {
    setPage(1);
  }, [filteredUser, category, severity, query]);

  const pageRows = useMemo(
    () => paginate(filtered, page, PAGE_SIZE),
    [filtered, page]
  );

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Audit log"
        subtitle="Auth, payments, webhooks & account events"
      />

      {/* Stat strip */}
      <div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-4">
        <Stat label="Total events" value={stats.total} tone="ink" />
        <Stat label="Warnings" value={stats.warnings} tone="glow" />
        <Stat label="Errors" value={stats.errors} tone="danger" />
        <Stat label="Today" value={stats.today} tone="ink-soft" />
      </div>

      {/* Control bar */}
      <div className="mb-5 space-y-3">
        {filteredUser && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              filter
            </span>
            <button
              onClick={clearUserFilter}
              className="group inline-flex items-center gap-2 border border-ink bg-ink px-3 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink/85"
            >
              Filtered to {filteredUser.label}
              <X size={13} className="text-paper/70 transition-colors group-hover:text-paper" />
            </button>
          </div>
        )}

        {/* Search */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search actor, action, target…"
          className="h-9 w-full max-w-md border border-ink/15 bg-paper px-3 font-mono text-xs text-ink transition-all placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink sm:max-w-sm"
        />

        {/* Category filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            category
          </span>
          <Pill
            active={category === "all"}
            onClick={() => setCategory("all")}
            label="all"
            count={all.length}
          />
          {CATEGORIES.map((c) => (
            <Pill
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
              label={c}
              count={categoryCounts[c]}
            />
          ))}
        </div>

        {/* Severity filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            severity
          </span>
          {(["all", "info", "warning", "error"] as const).map((s) => (
            <Pill
              key={s}
              active={severity === s}
              onClick={() => setSeverity(s)}
              label={s}
            />
          ))}
        </div>
      </div>

      <Panel className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ScrollText size={22} strokeWidth={1.6} />}
            title="No matching events"
            description="Adjust the search or filters to surface audit entries."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="sticky top-0">
                <tr className="border-b border-line bg-surface text-left">
                  {["", "Timestamp", "Category", "Actor", "Action", "Target"].map(
                    (h, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageRows.map((e, i) => {
                  const sev = SEVERITY[e.severity];
                  return (
                    <tr
                      key={e._id}
                      onClick={() => setActive(e)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-paper-dim",
                        sev.rowTint
                          ? sev.rowTint
                          : i % 2 === 1 && "bg-paper-dim/40"
                      )}
                    >
                      {/* Severity marker */}
                      <td className="py-2.5 pl-4 pr-0 align-middle">
                        <span
                          className={cn("block h-2 w-2 rounded-full", sev.dot)}
                          title={sev.label}
                        />
                      </td>
                      {/* Timestamp */}
                      <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-ink-soft">
                        {formatDate(e.ts, true)}
                      </td>
                      {/* Category chip */}
                      <td className="px-4 py-2.5">
                        <CategoryChip category={e.category} />
                      </td>
                      {/* Actor */}
                      <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">
                        {e.actor}
                      </td>
                      {/* Action */}
                      <td className="px-4 py-2.5 font-mono text-xs text-ink">
                        {e.action}
                      </td>
                      {/* Target */}
                      <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">
                        {e.target ?? <span className="text-ink-faint">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {filtered.length > 0 && (
        <Pagination
          className="mt-5"
          total={filtered.length}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {/* Detail drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title="Audit entry"
      >
        {active && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Severity">
                <SeverityPill severity={active.severity} />
              </Field>
              <Field label="Category">
                <CategoryChip category={active.category} />
              </Field>
              <Field label="Timestamp">
                <span className="font-mono text-xs tabular-nums text-ink">
                  {formatDate(active.ts, true)}
                </span>
              </Field>
              <Field label="Actor">
                <span className="break-all font-mono text-xs text-ink">
                  {active.actor}
                </span>
              </Field>
            </div>

            <Field label="Action">
              <span className="font-mono text-xs text-ink">{active.action}</span>
            </Field>

            <Field label="Target">
              {active.target ? (
                <CopyMono value={active.target} display={active.target} />
              ) : (
                <span className="font-mono text-xs text-ink-faint">—</span>
              )}
            </Field>

            <Field label="Entry id">
              <CopyMono value={active._id} display={active._id} />
            </Field>

            {/* Terminal-style full entry */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                <Terminal size={12} /> Raw entry
              </p>
              <pre
                className="ink-panel-grid relative max-h-[50vh] overflow-auto bg-ink p-4 font-mono text-xs leading-relaxed text-paper/85"
                style={{ boxShadow: CARD_SHADOW }}
              >
                {formatRawEntry(active)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

// Terminal-log line for the dark <pre> panel.
function formatRawEntry(e: AuditLogEntry): string {
  const lines = [
    `[${e.severity.toUpperCase()}] ${e.ts}`,
    `category : ${e.category}`,
    `actor    : ${e.actor}`,
    `action   : ${e.action}`,
    `target   : ${e.target ?? "—"}`,
    `meta     : ${e.meta ?? "—"}`,
    `id       : ${e._id}`,
  ];
  return lines.join("\n");
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ink" | "ink-soft" | "glow" | "danger";
}) {
  const valueCls = {
    ink: "text-ink",
    "ink-soft": "text-ink-soft",
    glow: "text-[#8a6a2e]",
    danger: "text-danger",
  }[tone];
  return (
    <div className="bg-surface px-4 py-4" style={{ boxShadow: CARD_SHADOW }}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-headline text-2xl font-bold tabular-nums leading-none tracking-[-0.02em]",
          valueCls
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 border px-3 py-1 font-mono text-[11px] lowercase tracking-[0.06em] transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-line bg-surface text-ink-soft hover:border-ink hover:text-ink"
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "tabular-nums",
            active ? "text-paper/60" : "text-ink-faint"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function CategoryChip({ category }: { category: AuditCategory }) {
  return (
    <span className="inline-flex items-center border border-line bg-paper-dim/40 px-2 py-0.5 font-mono text-[10px] lowercase tracking-[0.08em] text-ink-soft">
      {category}
    </span>
  );
}

function SeverityPill({ severity }: { severity: AuditSeverity }) {
  const map = {
    info: { cls: "border-line text-ink-faint" },
    warning: { cls: "border-glow/50 bg-glow/[0.08] text-[#8a6a2e]" },
    error: { cls: "border-danger text-danger" },
  }[severity];
  const sev = SEVERITY[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border bg-surface px-2 py-0.5 font-mono text-[10px] lowercase tracking-[0.06em]",
        map.cls
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} />
      {sev.label}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
      {children}
    </div>
  );
}
