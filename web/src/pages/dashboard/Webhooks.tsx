import { useMemo, useState } from "react";
import { Clock, Info, Webhook as WebhookIcon } from "lucide-react";
import { PageHeader, Panel, CARD_SHADOW } from "@/components/dashboard/Shared";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { CopyMono, LoadingBlock, EmptyState } from "@/components/ui/Misc";
import { useAsync } from "@/hooks/useAsync";
import { listWebhookEvents } from "@/services/api";
import { cn, formatDate, truncateMiddle } from "@/lib/utils";
import type { WebhookEvent, WebhookProvider } from "@/lib/types";

const PROVIDER_TONE: Record<WebhookProvider, Parameters<typeof Badge>[0]["tone"]> = {
  stripe: "secondary",
  docuseal: "accent",
  documenso: "info",
};

type ProcessedState = "processed" | "pending" | "error";
function processedState(e: WebhookEvent): ProcessedState {
  if (e.error) return "error";
  return e.processed ? "processed" : "pending";
}

const FILTERS = ["all", "stripe", "docuseal", "documenso"] as const;

export default function Webhooks() {
  const { data: events, loading } = useAsync(listWebhookEvents, []);
  const [active, setActive] = useState<WebhookEvent | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const filtered = useMemo(() => {
    let list = events ?? [];
    if (filter !== "all") list = list.filter((e) => e.provider === filter);
    return list;
  }, [events, filter]);

  const stats = useMemo(() => {
    const all = events ?? [];
    return {
      total: all.length,
      processed: all.filter((e) => e.processed && !e.error).length,
      deduped: all.filter((e) => e.deduped).length,
      errors: all.filter((e) => e.error).length,
    };
  }, [events]);

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        eyebrow="webhooks.log"
        title="Webhook events"
        subtitle="Every inbound event, idempotently logged. Proof that each deposit_paid maps to a verified Stripe event."
      />

      {/* Mini stats */}
      <div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-4">
        <MiniStat label="Total events" value={stats.total} tone="ink" />
        <MiniStat label="Processed" value={stats.processed} tone="ink" />
        <MiniStat label="Deduped" value={stats.deduped} tone="ink-soft" />
        <MiniStat label="Errors / retrying" value={stats.errors} tone="danger" />
      </div>

      {/* Provider filter pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          filter
        </span>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "border px-3 py-1 font-mono text-[11px] lowercase tracking-[0.06em] transition-colors",
              filter === f
                ? "border-ink bg-ink text-paper"
                : "border-line bg-surface text-ink-soft hover:border-ink hover:text-ink"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <Panel className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<WebhookIcon size={22} strokeWidth={1.6} />}
            title="No events"
            description="Inbound webhook deliveries will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="sticky top-0">
                <tr className="border-b border-line bg-surface text-left">
                  {["Received", "Provider", "Type", "Event id", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((e, i) => {
                  const st = processedState(e);
                  return (
                    <tr
                      key={e._id}
                      onClick={() => setActive(e)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-paper-dim",
                        i % 2 === 1 && "bg-paper-dim/40"
                      )}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-ink-soft">
                        {formatDate(e.receivedAt, true)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={PROVIDER_TONE[e.provider]}>{e.provider}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-ink">{e.type}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <CopyMono value={e.eventId} display={truncateMiddle(e.eventId, 12, 5)} />
                          {e.deduped && (
                            <span className="inline-flex items-center gap-1 border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                              <Info size={10} /> deduped
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <ProcessedPill state={st} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Payload drawer */}
      <Drawer open={!!active} onClose={() => setActive(null)} title="Webhook event">
        {active && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Provider">
                <Badge tone={PROVIDER_TONE[active.provider]}>{active.provider}</Badge>
              </Field>
              <Field label="Status">
                <ProcessedPill state={processedState(active)} />
              </Field>
              <Field label="Type">
                <span className="font-mono text-xs text-ink">{active.type}</span>
              </Field>
              <Field label="Received">
                <span className="font-mono text-xs tabular-nums text-ink">
                  {formatDate(active.receivedAt, true)}
                </span>
              </Field>
            </div>

            <Field label="Event id">
              <CopyMono value={active.eventId} display={active.eventId} />
            </Field>

            {active.deduped && (
              <div className="flex items-start gap-2 border border-line bg-paper-dim px-3 py-2.5 font-mono text-[11px] leading-relaxed text-ink-soft">
                <Info size={14} className="mt-0.5 shrink-0 text-ink-faint" />
                Duplicate delivery. The unique index on eventId made this a no-op —
                no double charge, no duplicate balance invoice.
              </div>
            )}

            {active.error && (
              <div className="flex items-start gap-2 border border-danger/40 bg-surface px-3 py-2.5 font-mono text-[11px] leading-relaxed text-danger">
                <Clock size={14} className="mt-0.5 shrink-0" />
                {active.error}
              </div>
            )}

            <div>
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                Raw payload
              </p>
              <pre
                className="ink-panel-grid relative max-h-[50vh] overflow-auto bg-ink p-4 font-mono text-xs leading-relaxed text-paper/85"
                style={{ boxShadow: CARD_SHADOW }}
              >
                {JSON.stringify(active.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

function ProcessedPill({ state }: { state: ProcessedState }) {
  const map = {
    processed: { dot: "bg-glow", cls: "border-glow/50 text-ink", label: "processed" },
    pending: { dot: "bg-ink-faint", cls: "border-line text-ink-faint", label: "pending" },
    error: { dot: "bg-danger", cls: "border-danger text-danger", label: "error" },
  }[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border bg-surface px-2 py-0.5 font-mono text-[10px] lowercase tracking-[0.06em]",
        map.cls
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", map.dot)} />
      {map.label}
    </span>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ink" | "ink-soft" | "danger";
}) {
  const valueCls = {
    ink: "text-ink",
    "ink-soft": "text-ink-soft",
    danger: "text-danger",
  }[tone];
  return (
    <div className="bg-surface px-4 py-4" style={{ boxShadow: CARD_SHADOW }}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
      <p className={cn("mt-2 font-headline text-2xl font-bold tabular-nums leading-none tracking-[-0.02em]", valueCls)}>
        {value}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
      {children}
    </div>
  );
}
