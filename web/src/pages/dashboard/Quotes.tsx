import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Send,
  ExternalLink,
  FileDown,
  Copy,
  Pencil,
  Trash2,
  Check,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, Panel, StatusPill } from "@/components/dashboard/Shared";
import { Button } from "@/components/ui/Button";
import { Money, EmptyState, LoadingBlock } from "@/components/ui/Misc";
import { Modal } from "@/components/ui/Modal";
import { useAsync } from "@/hooks/useAsync";
import {
  listQuotes,
  listClients,
  sendQuote,
  deleteQuote,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { cn, formatDate } from "@/lib/utils";
import { openQuotePrintView } from "@/lib/printQuote";
import { Pagination, paginate } from "@/components/ui/Pagination";
import type { Quote, QuoteStatus } from "@/lib/types";

const FILTERS: { value: QuoteStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "approved", label: "Approved" },
  { value: "deposit_paid", label: "Deposit paid" },
];

export default function Quotes() {
  const navigate = useNavigate();
  const { success, error, info } = useToast();
  const { isSandbox, user } = useAuth();
  const { data: quotes, loading, reload } = useAsync(listQuotes, []);
  const { data: clients } = useAsync(listClients, []);

  const [filter, setFilter] = useState<QuoteStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [shareQuote, setShareQuote] = useState<Quote | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Quote | null>(null);
  const [copied, setCopied] = useState(false);
  // UI-only: which quote drives the right-hand approval preview.
  const [selected, setSelected] = useState<string | null>(null);
  // Pagination over the filtered list (UI-only).
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const businessName = user?.brand.businessName ?? "Your business";

  const clientName = useMemo(() => {
    const m = new Map((clients ?? []).map((c) => [c._id, c.name]));
    return (id: string) => m.get(id) ?? "—";
  }, [clients]);

  const filtered = useMemo(() => {
    let list = quotes ?? [];
    if (filter !== "all") list = list.filter((q) => q.status === filter);
    if (query.trim()) {
      const t = query.toLowerCase();
      list = list.filter(
        (q) =>
          q.title.toLowerCase().includes(t) ||
          clientName(q.clientId).toLowerCase().includes(t)
      );
    }
    return list;
  }, [quotes, filter, query, clientName]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: (quotes ?? []).length };
    for (const q of quotes ?? []) c[q.status] = (c[q.status] ?? 0) + 1;
    return c;
  }, [quotes]);

  // Reset to the first page whenever the result set or page size changes.
  useEffect(() => {
    setPage(1);
  }, [filter, query, pageSize]);

  const paged = useMemo(
    () => paginate(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  // Default the preview to the first visible quote; keep it valid as the
  // paged list changes. UI concern only — no data/logic touched.
  useEffect(() => {
    if (paged.length === 0) {
      if (selected !== null) setSelected(null);
      return;
    }
    if (!selected || !paged.some((q) => q._id === selected)) {
      setSelected(paged[0]._id);
    }
  }, [paged, selected]);

  const activeQuote = useMemo(
    () => paged.find((q) => q._id === selected) ?? null,
    [paged, selected]
  );

  const handleSend = async (q: Quote) => {
    try {
      await sendQuote(q._id);
      success("Quote sent", `Link emailed to ${clientName(q.clientId)}.`);
      reload();
    } catch (e) {
      error("Couldn't send", e instanceof Error ? e.message : "");
    }
  };

  const handlePdf = (q: Quote) => {
    openQuotePrintView({
      title: q.title,
      businessName,
      clientName: clientName(q.clientId),
      currency: q.currency,
      lineItems: q.lineItems,
      subtotal: q.subtotal,
      taxTotal: q.taxTotal,
      total: q.total,
      depositAmount: q.depositAmount,
      balanceAmount: q.balanceAmount,
      amountPaid: q.amountPaid,
    });
    info("Opening print view", "Use your browser's “Save as PDF”.");
  };

  const shareUrl = (q: Quote) => `${window.location.origin}/q/${q.publicToken}`;

  const copyLink = (q: Quote) => {
    navigator.clipboard?.writeText(shareUrl(q));
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    await deleteQuote(confirmDelete._id);
    success("Quote deleted");
    setConfirmDelete(null);
    reload();
  };

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        eyebrow="Pipeline"
        title="Quotes"
        subtitle="Build, send and track every estimate."
        action={
          <button
            onClick={() => navigate("/dashboard/quotes/new")}
            className="group btn btn-solid btn-sm"
          >
            <Plus size={15} /> New quote
          </button>
        }
      />

      {/* ── Filter pills + search ─────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const on = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
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
                  {counts[f.value] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative sm:w-64">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or client…"
            className="h-9 w-full border border-line bg-surface pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Panel className="p-2">
          <EmptyState
            icon={<FileText size={28} />}
            title="No quotes here"
            description={
              query
                ? "Try a different search or filter."
                : "Create your first quote to get started."
            }
            action={
              <button
                onClick={() => navigate("/dashboard/quotes/new")}
                className="group btn btn-solid btn-sm"
              >
                <Plus size={15} /> New quote
              </button>
            }
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* ── LEFT: selectable quote list ──────────────────────────── */}
          <div className="lg:col-span-7">
            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  {filtered.length} quote{filtered.length === 1 ? "" : "s"}
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  Updated
                </span>
              </div>
              <ul className="divide-y divide-line">
                {paged.map((q) => {
                  const on = q._id === selected;
                  return (
                    <li key={q._id}>
                      <button
                        onClick={() => setSelected(q._id)}
                        className={cn(
                          "flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors",
                          on
                            ? "bg-paper-dim"
                            : "hover:bg-paper-dim/60"
                        )}
                      >
                        <span
                          className={cn(
                            "h-9 w-0.5 shrink-0 self-stretch",
                            on ? "bg-glow" : "bg-transparent"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-headline text-[15px] font-semibold tracking-[-0.01em] text-ink">
                            {q.title}
                          </p>
                          <p className="mt-0.5 truncate font-sans text-[13px] text-ink-soft">
                            {clientName(q.clientId)}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <StatusPill status={q.status} />
                            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                              {formatDate(q.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <Money
                            minor={q.total}
                            currency={q.currency}
                            className="block text-[15px] font-semibold text-ink"
                          />
                          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                            Dep{" "}
                            <Money
                              minor={q.depositAmount}
                              currency={q.currency}
                              className="text-ink-soft normal-case"
                            />
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            {filtered.length > 0 && (
              <Pagination
                className="mt-4"
                total={filtered.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>

          {/* ── RIGHT: live client-approval preview ──────────────────── */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-6">
              {activeQuote ? (
                <Panel className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                      Client preview
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      /q/{activeQuote.publicToken.slice(0, 16)}…
                    </span>
                  </div>

                  {/* Branded ink header — faithful to the public approval page */}
                  <div className="relative isolate overflow-hidden bg-ink px-5 py-4 text-paper">
                    <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
                    <div className="relative flex items-center gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55">
                          Quote from
                        </p>
                        <p className="font-headline text-base font-semibold leading-tight text-paper">
                          {businessName}
                        </p>
                      </div>
                      <span className="ml-auto inline-flex items-center gap-1.5 border border-paper/25 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-paper/70">
                        <ShieldCheck size={11} /> Secure
                      </span>
                    </div>
                  </div>

                  {/* The quote "paper" body */}
                  <div className="px-5 py-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                          Prepared for {clientName(activeQuote.clientId)}
                        </p>
                        <h2 className="mt-1 font-headline text-xl font-semibold tracking-[-0.02em] text-ink">
                          {activeQuote.title}
                        </h2>
                      </div>
                      <StatusPill status={activeQuote.status} />
                    </div>

                    {/* Line items */}
                    <ul className="divide-y divide-line border-y border-line">
                      {activeQuote.lineItems.map((li) => (
                        <li
                          key={li._id}
                          className={cn(
                            "flex items-center justify-between gap-3 py-2.5",
                            !li.selected && "opacity-45"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-sans text-[13px] text-ink">
                              {li.label}
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                              {li.qty} × <Money minor={li.unitPrice} currency={activeQuote.currency} className="normal-case text-ink-faint" />
                              {li.type !== "standard" && ` · ${li.type}`}
                            </p>
                          </div>
                          <Money
                            minor={li.unitPrice * li.qty}
                            currency={activeQuote.currency}
                            className="shrink-0 text-[13px] text-ink"
                          />
                        </li>
                      ))}
                    </ul>

                    {/* Totals */}
                    <dl className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                          Subtotal
                        </dt>
                        <Money
                          minor={activeQuote.subtotal}
                          currency={activeQuote.currency}
                          className="text-[13px] text-ink-soft"
                        />
                      </div>
                      {activeQuote.taxTotal > 0 && (
                        <div className="flex items-center justify-between">
                          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                            Tax
                          </dt>
                          <Money
                            minor={activeQuote.taxTotal}
                            currency={activeQuote.currency}
                            className="text-[13px] text-ink-soft"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-line pt-2">
                        <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink">
                          Total
                        </dt>
                        <Money
                          minor={activeQuote.total}
                          currency={activeQuote.currency}
                          className="font-headline text-lg font-bold text-ink"
                        />
                      </div>
                    </dl>

                    {/* Deposit due */}
                    <div className="mt-3 flex items-center justify-between border border-line bg-glow/[0.06] px-3 py-2.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6a2e]">
                        Deposit due today
                      </span>
                      <Money
                        minor={activeQuote.depositAmount}
                        currency={activeQuote.currency}
                        className="font-headline text-base font-bold text-[#8a6a2e]"
                      />
                    </div>
                  </div>

                  {/* Row actions */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper-dim px-5 py-3">
                    {activeQuote.status === "draft" ? (
                      <button
                        onClick={() => handleSend(activeQuote)}
                        className="group btn btn-solid btn-sm"
                      >
                        <Send size={14} /> Send
                      </button>
                    ) : (
                      <button
                        onClick={() => setShareQuote(activeQuote)}
                        className="group btn btn-outline btn-sm"
                      >
                        <ExternalLink size={14} /> Client link
                      </button>
                    )}
                    <button
                      onClick={() => handlePdf(activeQuote)}
                      className="group btn btn-outline btn-sm"
                    >
                      <FileDown size={14} /> PDF
                    </button>
                    {(activeQuote.status === "draft" ||
                      activeQuote.status === "sent" ||
                      activeQuote.status === "viewed") && (
                      <button
                        onClick={() =>
                          navigate(`/dashboard/quotes/${activeQuote._id}/edit`)
                        }
                        className="group btn btn-outline btn-sm"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                    )}
                    <IconBtn
                      title="Delete"
                      onClick={() => setConfirmDelete(activeQuote)}
                      danger
                    >
                      <Trash2 size={15} />
                    </IconBtn>
                  </div>
                </Panel>
              ) : (
                <Panel className="p-2">
                  <EmptyState
                    icon={<FileText size={28} />}
                    title="Select a quote"
                    description="Pick a quote from the list to preview what your client sees."
                  />
                </Panel>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      <Modal
        open={!!shareQuote}
        onClose={() => setShareQuote(null)}
        title="Client approval link"
        description="Send this link — no account needed on the client side."
      >
        {shareQuote && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border border-line bg-paper px-3 py-2.5">
              <code className="flex-1 truncate font-mono text-xs text-ink">
                {shareUrl(shareQuote)}
              </code>
              <Button size="sm" variant="ghost" onClick={() => copyLink(shareQuote)}>
                {copied ? <Check size={14} className="text-glow" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                fullWidth
                onClick={() => {
                  window.open(shareUrl(shareQuote), "_blank", "noopener");
                  setShareQuote(null);
                }}
              >
                <ExternalLink size={15} /> Open client view
              </Button>
            </div>
            {isSandbox && (
              <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
                In the sandbox the link opens the real approval flow against your
                in-memory data.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete quote?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete}>Delete</Button>
          </>
        }
      >
        <p className="font-sans text-sm leading-relaxed text-ink-soft">
          This permanently removes “{confirmDelete?.title}”. This can't be undone.
        </p>
      </Modal>
    </>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "ml-auto p-2 text-ink-soft transition-colors hover:bg-paper-dim",
        danger ? "hover:text-danger" : "hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}
