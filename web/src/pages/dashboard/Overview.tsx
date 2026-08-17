import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Send,
  Eye,
  CircleDollarSign,
  Plus,
  ArrowRight,
  AlertTriangle,
  Clock,
  FileText,
  Users,
} from "lucide-react";
import { PageHeader, KpiCard, Panel, StatusPill } from "@/components/dashboard/Shared";
import { Money, LoadingBlock } from "@/components/ui/Misc";
import { useAsync } from "@/hooks/useAsync";
import { listQuotes, getFunnel, listActivity, listClients } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { formatHours, timeAgo, formatMoney } from "@/lib/utils";
import type { ActivityType } from "@/lib/types";

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  created: "Quote created",
  sent: "Quote sent",
  viewed: "Client viewed",
  selection_changed: "Selection changed",
  signed: "Client signed",
  approved: "Quote approved",
  deposit_paid: "Deposit paid",
  payment_failed: "Payment failed",
};

// ── Editorial section header used inside white panels ──────────────────────
function PanelHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-grotesk text-[15px] font-semibold leading-none tracking-[-0.01em] text-ink">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: quotes, loading: lq } = useAsync(listQuotes, []);
  const { data: funnel, loading: lf } = useAsync(getFunnel, []);
  const { data: activity } = useAsync(listActivity, []);
  const { data: clients } = useAsync(listClients, []);

  // Build a "deposit revenue over the last 6 weeks" trend from paid quotes.
  const trend = useMemo(() => {
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (5 - i) * 7);
      return {
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        start: d.getTime() - 7 * 86_400_000,
        end: d.getTime(),
        deposits: 0,
        sent: 0,
      };
    });
    for (const q of quotes ?? []) {
      if (q.depositPaidAt) {
        const t = new Date(q.depositPaidAt).getTime();
        const w = weeks.find((x) => t > x.start && t <= x.end);
        if (w) w.deposits += q.depositAmount;
      }
      if (q.sentAt) {
        const t = new Date(q.sentAt).getTime();
        const w = weeks.find((x) => t > x.start && t <= x.end);
        if (w) w.sent += 1;
      }
    }
    return weeks.map((w) => ({ name: w.label, deposits: w.deposits / 100, sent: w.sent }));
  }, [quotes]);

  const recent = useMemo(
    () => (quotes ?? []).slice(0, 5),
    [quotes]
  );

  const failedPayments = useMemo(
    () => (quotes ?? []).filter((q) => q.status === "approved").length,
    [quotes]
  );

  if (lq || lf) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        subtitle="Here's how your quotes are converting."
        action={
          <button className="btn btn-solid" onClick={() => navigate("/dashboard/quotes/new")}>
            <Plus size={16} /> New quote
          </button>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Quotes sent"
          value={funnel?.sent ?? 0}
          delta="+3 this month"
          icon={<Send size={18} />}
        />
        <KpiCard
          label="View → approve"
          value={`${funnel?.viewToApprovePct ?? 0}%`}
          delta="healthy"
          deltaTone="up"
          icon={<Eye size={18} />}
        />
        <KpiCard
          label="Deposit conversion"
          value={`${funnel?.sentToDepositPct ?? 0}%`}
          hint="of sent quotes"
          icon={<CircleDollarSign size={18} />}
        />
        <KpiCard
          label="Median time-to-approval"
          value={funnel ? formatHours(funnel.medianTimeToApprovalHours) : "—"}
          delta="trending down"
          deltaTone="up"
          icon={<Clock size={18} />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Trend chart */}
        <Panel>
          <PanelHead eyebrow="Confirmed deposits · last 6 weeks" title="Deposit revenue" />
          <div className="h-72 px-3 py-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="dep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C99A4B" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#C99A4B" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E5E2DA" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#9A968E" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9A968E" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  cursor={{ stroke: "#D9D5CC", strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 0,
                    border: "1px solid #D9D5CC",
                    boxShadow: "0 1px 2px rgba(22,24,28,0.05)",
                    fontSize: 12,
                    fontFamily: "JetBrains Mono",
                    color: "#16181C",
                    background: "#FFFFFF",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                  labelStyle={{ color: "#9A968E", fontSize: 10, letterSpacing: "0.08em" }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Deposits"]}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="#565A61"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="none"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  stroke="#C99A4B"
                  strokeWidth={2}
                  fill="url(#dep)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-5 border-t border-line px-5 py-3">
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              <span className="h-0.5 w-4 rounded-full bg-glow" /> Deposit revenue
            </span>
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              <span className="h-0.5 w-4 rounded-full bg-ink-soft" /> Quotes sent
            </span>
          </div>
        </Panel>

        {/* Quick actions + alerts */}
        <div className="space-y-6">
          <Panel>
            <PanelHead eyebrow="Shortcuts" title="Quick actions" />
            <div className="grid grid-cols-2 gap-3 p-4">
              <QuickAction icon={<Plus size={18} />} label="New quote" onClick={() => navigate("/dashboard/quotes/new")} />
              <QuickAction icon={<FileText size={18} />} label="All quotes" onClick={() => navigate("/dashboard/quotes")} />
              <QuickAction icon={<Users size={18} />} label="Add client" onClick={() => navigate("/dashboard/clients")} />
              <QuickAction icon={<CircleDollarSign size={18} />} label="Analytics" onClick={() => navigate("/dashboard/analytics")} />
            </div>
          </Panel>

          <Panel>
            <PanelHead eyebrow="Action items" title="Needs attention" />
            <div className="space-y-3 p-4">
              {failedPayments > 0 ? (
                <Alert
                  tone="warning"
                  icon={<AlertTriangle size={16} />}
                  title={`${failedPayments} approved, awaiting deposit`}
                  body="Signed quotes that haven't paid yet. One had a declined card."
                  onClick={() => navigate("/dashboard/pipeline")}
                />
              ) : null}
              <Alert
                tone="info"
                icon={<Users size={16} />}
                title={`${clients?.length ?? 0} active clients`}
                body="Your client directory is up to date."
                onClick={() => navigate("/dashboard/clients")}
              />
            </div>
          </Panel>
        </div>
      </div>

      {/* Recent quotes + activity feed */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel>
          <PanelHead
            eyebrow="Latest activity"
            title="Recent quotes"
            action={
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate("/dashboard/quotes")}
              >
                View all <ArrowRight size={14} />
              </button>
            }
          />
          <div className="divide-y divide-line">
            {recent.map((q) => (
              <button
                key={q._id}
                onClick={() => navigate("/dashboard/pipeline")}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-paper-dim"
              >
                <div className="min-w-0">
                  <p className="truncate font-grotesk text-sm font-medium text-ink">{q.title}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                    {timeAgo(q.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Money minor={q.total} currency={q.currency} className="text-sm text-ink" />
                  <StatusPill status={q.status} />
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead eyebrow="Event stream" title="Activity" />
          <div className="max-h-80 space-y-0 overflow-y-auto px-5 py-2 no-scrollbar">
            {(activity ?? []).slice(0, 12).map((a) => (
              <div key={a._id} className="flex items-start gap-3 py-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" />
                <div className="min-w-0">
                  <p className="font-sans text-sm text-ink-soft">
                    {ACTIVITY_LABEL[a.type]}
                    {a.meta && "amount" in a.meta ? (
                      <span className="ml-1 font-mono text-xs tabular-nums text-glow">
                        {formatMoney(Number((a.meta as { amount: number }).amount))}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                    {a.actor} · {timeAgo(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-2 border border-line bg-surface p-3 text-left transition-colors hover:border-ink/30 hover:bg-paper-dim"
    >
      <span className="text-ink-faint transition-colors group-hover:text-glow">{icon}</span>
      <span className="font-grotesk text-sm font-medium text-ink">{label}</span>
    </button>
  );
}

function Alert({
  tone,
  icon,
  title,
  body,
  onClick,
}: {
  tone: "warning" | "info";
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  const accent = tone === "warning" ? "text-danger" : "text-ink-faint";
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 border border-line bg-surface px-3 py-3 text-left transition-colors hover:bg-paper-dim"
    >
      <span className={`mt-0.5 shrink-0 ${accent}`}>{icon}</span>
      <span>
        <span className="block font-grotesk text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block font-sans text-xs text-ink-soft">{body}</span>
      </span>
    </button>
  );
}
