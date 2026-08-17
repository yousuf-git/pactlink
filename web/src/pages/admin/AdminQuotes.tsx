import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, FileText, ChevronRight, ArrowUpDown, X } from "lucide-react";
import { PageHeader, Panel, StatusPill } from "@/components/dashboard/Shared";
import { Money, EmptyState, LoadingBlock } from "@/components/ui/Misc";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Drawer } from "@/components/ui/Drawer";
import { useAsync } from "@/hooks/useAsync";
import { listAllQuotes, listPlatformUsers } from "@/services/adminApi";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import type { AdminQuoteRow, QuoteStatus } from "@/lib/types";

const PAGE_SIZE = 25;

const STATUS_FILTERS: { value: QuoteStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "approved", label: "Approved" },
  { value: "deposit_paid", label: "Deposit paid" },
];

type SortKey = "value" | "updated";

export default function AdminQuotes() {
  const { data: quotes, loading } = useAsync(listAllQuotes, []);
  const { data: owners } = useAsync(listPlatformUsers, []);
  const [params, setParams] = useSearchParams();
  const userFilter = params.get("user");

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<QuoteStatus | "all">("all");
  // The owner select is seeded from ?user= and stays in sync with it.
  const [owner, setOwner] = useState<string>(userFilter ?? "all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [detail, setDetail] = useState<AdminQuoteRow | null>(null);
  const [page, setPage] = useState(1);

  // Keep the owner select aligned when the ?user= param changes (e.g. arriving
  // from the Users page redirect).
  useEffect(() => {
    setOwner(userFilter ?? "all");
  }, [userFilter]);

  const rows = quotes ?? [];

  // Owner name backing the ?user= chip (resolved from the loaded owners list).
  const filteredOwnerName = useMemo(() => {
    if (!userFilter) return null;
    const o = (owners ?? []).find((u) => u._id === userFilter);
    return o?.businessName || o?.name || userFilter;
  }, [owners, userFilter]);

  const clearUserFilter = () => {
    const next = new URLSearchParams(params);
    next.delete("user");
    setParams(next, { replace: true });
    setOwner("all");
    setPage(1);
  };

  // Owner select options — businessName preferred, falls back to name.
  const ownerOptions = useMemo(
    () =>
      (owners ?? [])
        .map((u) => ({ id: u._id, label: u.businessName || u.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [owners]
  );

  // Status pill counts across the full (unfiltered) dataset.
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const q of rows) c[q.status] = (c[q.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (status !== "all") list = list.filter((q) => q.status === status);
    if (owner !== "all") list = list.filter((q) => q.ownerId === owner);
    if (query.trim()) {
      const t = query.toLowerCase();
      list = list.filter(
        (q) =>
          q.title.toLowerCase().includes(t) ||
          q.ownerName.toLowerCase().includes(t) ||
          q.clientName.toLowerCase().includes(t)
      );
    }
    const sorted = [...list];
    if (sort === "value") sorted.sort((a, b) => b.total - a.total);
    else sorted.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return sorted;
  }, [rows, status, owner, query, sort]);

  // Reset to page 1 whenever the filtered set changes shape.
  useEffect(() => {
    setPage(1);
  }, [status, owner, query, sort]);

  const pageRows = useMemo(
    () => paginate(filtered, page, PAGE_SIZE),
    [filtered, page]
  );

  // Mini-stats summarize the CURRENT filtered view.
  const stats = useMemo(() => {
    const totalValue = filtered.reduce((s, q) => s + q.total, 0);
    const paid = filtered.filter((q) => q.status === "deposit_paid");
    const depositVolume = paid.reduce((s, q) => s + q.depositAmount, 0);
    return {
      count: filtered.length,
      totalValue,
      depositPaidCount: paid.length,
      depositVolume,
      currency: filtered[0]?.currency ?? "USD",
    };
  }, [filtered]);

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Quotes"
        subtitle={`Every quote across all accounts · ${rows.length} total`}
      />

      {/* ── Summary strip ──────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Quotes (view)" value={String(stats.count)} />
        <MiniStat
          label="Total value"
          value={<Money minor={stats.totalValue} currency={stats.currency} />}
        />
        <MiniStat label="Deposit paid" value={String(stats.depositPaidCount)} glow />
        <MiniStat
          label="Deposit volume"
          value={<Money minor={stats.depositVolume} currency={stats.currency} />}
          glow
        />
      </div>

      {/* ── Control bar ────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3">
        {filteredOwnerName && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Filter
            </span>
            <button
              onClick={clearUserFilter}
              className="group inline-flex items-center gap-2 border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-paper transition-colors hover:bg-ink/85"
            >
              Filtered to {filteredOwnerName}
              <X size={13} className="text-paper/70 transition-colors group-hover:text-paper" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const on = status === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 border px-3 py-1.5 font-grotesk text-[13px] font-medium transition-colors",
                  on
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-surface text-ink-soft hover:border-ink/40 hover:text-ink"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums tracking-wide",
                    on ? "text-paper/70" : "text-ink-faint"
                  )}
                >
                  {statusCounts[f.value] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, owner or client…"
              className="h-9 w-full border border-line bg-surface pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <select
            value={owner}
            onChange={(e) => {
              const v = e.target.value;
              setOwner(v);
              // Keep the URL ?user= chip in sync with the owner select.
              const next = new URLSearchParams(params);
              if (v === "all") next.delete("user");
              else next.set("user", v);
              setParams(next, { replace: true });
            }}
            className="h-9 border border-line bg-surface px-3 font-sans text-sm text-ink transition-colors focus:border-ink focus:outline-none sm:w-56"
          >
            <option value="all">All owners</option>
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <ArrowUpDown
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 border border-line bg-surface pl-9 pr-3 font-sans text-sm text-ink transition-colors focus:border-ink focus:outline-none"
            >
              <option value="updated">Sort: Updated</option>
              <option value="value">Sort: Value</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Quotes table ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Panel className="p-2">
          <EmptyState
            icon={<FileText size={28} />}
            title="No quotes match"
            description={
              query || status !== "all" || owner !== "all"
                ? "Try clearing a filter or searching for something else."
                : "There are no quotes across the platform yet."
            }
          />
        </Panel>
      ) : (
        <>
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  {[
                    "Title",
                    "Owner",
                    "Client",
                    "Status",
                    "Total",
                    "Deposit",
                    "Updated",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint",
                        i >= 4 ? "text-right" : "text-left"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-8 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageRows.map((q) => (
                  <tr
                    key={q._id}
                    onClick={() => setDetail(q)}
                    className="group cursor-pointer transition-colors hover:bg-paper-dim/50"
                  >
                    <td className="max-w-[18rem] px-4 py-3">
                      <p className="truncate font-headline text-[14px] font-semibold tracking-[-0.01em] text-ink">
                        {q.title}
                      </p>
                      <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                        {q._id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block max-w-[12rem] truncate font-sans text-[13px] text-ink-soft">
                        {q.ownerName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block max-w-[12rem] truncate font-sans text-[13px] text-ink-soft">
                        {q.clientName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={q.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money
                        minor={q.total}
                        currency={q.currency}
                        className="text-[13px] font-semibold text-ink"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money
                        minor={q.depositAmount}
                        currency={q.currency}
                        className="text-[13px] text-ink-soft"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                      {timeAgo(q.updatedAt)}
                    </td>
                    <td className="px-2 py-3 text-ink-faint">
                      <ChevronRight
                        size={15}
                        className="transition-colors group-hover:text-ink"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Pagination
          className="mt-5"
          total={filtered.length}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
        </>
      )}

      {/* ── Detail drawer ──────────────────────────────────────────────── */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title ?? "Quote"}
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <StatusPill status={detail.status} />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                {detail._id}
              </span>
            </div>

            <dl className="divide-y divide-line border-y border-line">
              <DetailRow label="Owner" value={detail.ownerName} />
              <DetailRow label="Client" value={detail.clientName} />
              <DetailRow
                label="Total"
                value={
                  <Money
                    minor={detail.total}
                    currency={detail.currency}
                    className="text-[13px] font-semibold text-ink"
                  />
                }
              />
              <DetailRow
                label="Deposit"
                value={
                  <Money
                    minor={detail.depositAmount}
                    currency={detail.currency}
                    className="text-[13px] text-ink-soft"
                  />
                }
              />
              <DetailRow label="Currency" value={detail.currency} />
              <DetailRow label="Updated" value={formatDate(detail.updatedAt, true)} />
            </dl>

            <div className="border border-line bg-glow/[0.06] px-3 py-2.5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6a2e]">
                Deposit on this quote
              </p>
              <Money
                minor={detail.depositAmount}
                currency={detail.currency}
                className="mt-1 block font-headline text-lg font-bold text-[#8a6a2e]"
              />
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

function MiniStat({
  label,
  value,
  glow,
}: {
  label: string;
  value: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-line bg-surface px-4 py-3",
        glow && "border-glow/40 bg-glow/[0.05]"
      )}
    >
      <p
        className={cn(
          "font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
          glow ? "text-[#8a6a2e]" : "text-ink-faint"
        )}
      >
        {label}
      </p>
      <p className="mt-1.5 font-headline text-[1.4rem] font-bold tabular-nums leading-none tracking-[-0.02em] text-ink">
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right font-sans text-[13px] text-ink">
        {value}
      </dd>
    </div>
  );
}
