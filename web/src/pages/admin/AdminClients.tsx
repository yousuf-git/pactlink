import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Users2, X } from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/Shared";
import { EmptyState, LoadingBlock } from "@/components/ui/Misc";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { useAsync } from "@/hooks/useAsync";
import { listAllClients } from "@/services/adminApi";
import { cn, formatDate } from "@/lib/utils";

const PAGE_SIZE = 25;

export default function AdminClients() {
  const { data: clients, loading } = useAsync(listAllClients, []);
  const [params, setParams] = useSearchParams();
  const userFilter = params.get("user");

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const rows = clients ?? [];

  // The owner name backing the ?user= chip (looked up from the rows).
  const filteredOwnerName = useMemo(() => {
    if (!userFilter) return null;
    return rows.find((c) => c.ownerId === userFilter)?.ownerName ?? userFilter;
  }, [rows, userFilter]);

  const clearUserFilter = () => {
    const next = new URLSearchParams(params);
    next.delete("user");
    setParams(next, { replace: true });
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (userFilter) list = list.filter((c) => c.ownerId === userFilter);
    if (query.trim()) {
      const t = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(t) ||
          c.email.toLowerCase().includes(t) ||
          (c.company?.toLowerCase().includes(t) ?? false) ||
          c.ownerName.toLowerCase().includes(t)
      );
    }
    return list;
  }, [rows, userFilter, query]);

  const pageRows = useMemo(
    () => paginate(filtered, page, PAGE_SIZE),
    [filtered, page]
  );

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Clients"
        subtitle={`Every client across all accounts · ${rows.length} total`}
      />

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

        <div className="relative max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search client, company, email or business…"
            className="h-9 w-full border border-line bg-surface pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      {/* ── Clients table ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Panel className="p-2">
          <EmptyState
            icon={<Users2 size={28} />}
            title="No clients match"
            description={
              query || userFilter
                ? "Try clearing a filter or searching for something else."
                : "There are no clients across the platform yet."
            }
          />
        </Panel>
      ) : (
        <>
          <Panel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    {["Client", "Company", "Owner / business", "Email", "Quotes"].map(
                      (h, i) => (
                        <th
                          key={h}
                          className={cn(
                            "px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint",
                            i === 4 ? "text-right" : "text-left"
                          )}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pageRows.map((c) => (
                    <tr
                      key={c._id}
                      className="transition-colors hover:bg-paper-dim/50"
                    >
                      <td className="px-4 py-3">
                        <p className="truncate font-headline text-[14px] font-semibold tracking-[-0.01em] text-ink">
                          {c.name}
                        </p>
                        <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                          joined {formatDate(c.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {c.company ? (
                          <span className="block max-w-[14rem] truncate font-sans text-[13px] text-ink-soft">
                            {c.company}
                          </span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block max-w-[14rem] truncate font-sans text-[13px] text-ink-soft">
                          {c.ownerName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block max-w-[16rem] truncate font-mono text-[12px] text-ink-soft">
                          {c.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-soft">
                        {c.quoteCount}
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
    </>
  );
}
