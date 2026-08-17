import { useCallback, useMemo } from "react";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  CircleDollarSign,
  Wallet,
  Target,
  Clock,
} from "lucide-react";
import { PageHeader, KpiCard, Panel } from "@/components/dashboard/Shared";
import { Money, LoadingBlock } from "@/components/ui/Misc";
import { useAsync } from "@/hooks/useAsync";
import {
  getPlatformStats,
  getPlatformGrowth,
  getPlatformFunnel,
  getPlanBreakdown,
  getTopUsers,
  listAuditLogs,
} from "@/services/adminApi";
import { formatHours, formatMoney, timeAgo } from "@/lib/utils";
import type { AuditSeverity, PlatformPlan } from "@/lib/types";

// ── Monochrome editorial palette (ink shades, glow marks the win) ───────────
const INK = "#16181C";
const INK_SOFT = "#565A61";
const GLOW = "#C99A4B";
const GRID = "#E5E2DA";
const AXIS = "#9A968E";
const DONUT_SHADES = ["#16181C", "#3A3D42", "#565A61", "#9A968E"];

const PLAN_LABEL: Record<PlatformPlan, string> = {
  trial: "Trial",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

const SEVERITY_DOT: Record<AuditSeverity, string> = {
  info: "bg-ink-faint",
  warning: "bg-glow",
  error: "bg-danger",
};

const TOOLTIP_STYLE = {
  borderRadius: 0,
  border: "1px solid #D9D5CC",
  boxShadow: "0 1px 2px rgba(22,24,28,0.05)",
  background: "#FFFFFF",
  fontFamily: "JetBrains Mono",
  fontSize: 12,
  color: INK,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

// ── Editorial section header used inside white panels ───────────────────────
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

export default function AdminOverview() {
  const topUsersFn = useCallback(() => getTopUsers(8), []);

  const { data: stats, loading: ls } = useAsync(getPlatformStats, []);
  const { data: growth, loading: lg } = useAsync(getPlatformGrowth, []);
  const { data: funnel, loading: lf } = useAsync(getPlatformFunnel, []);
  const { data: plans } = useAsync(getPlanBreakdown, []);
  const { data: topUsers } = useAsync(topUsersFn, []);
  const { data: logs } = useAsync(listAuditLogs, []);

  // Growth chart — revenue (glow area, the win) + new users (ink bars).
  const growthSeries = useMemo(
    () =>
      (growth ?? []).map((g) => ({
        period: g.period,
        revenue: g.revenue / 100,
        newUsers: g.newUsers,
      })),
    [growth]
  );

  // Funnel stages — Sent → Viewed → Approved → Deposit paid (CSS bars).
  const funnelBars = useMemo(() => {
    if (!funnel) return [];
    const base = Math.max(funnel.sent, 1);
    return [
      { stage: "Sent", count: funnel.sent, fill: "#565A61", prior: null as number | null },
      { stage: "Viewed", count: funnel.viewed, fill: "#3A3D42", prior: funnel.sentToViewedPct },
      { stage: "Approved", count: funnel.approved, fill: "#16181C", prior: funnel.viewedToApprovedPct },
      { stage: "Deposit paid", count: funnel.depositPaid, fill: GLOW, prior: funnel.approvedToDepositPct },
    ].map((s) => ({ ...s, pct: Math.round((s.count / base) * 100) }));
  }, [funnel]);

  // Plan breakdown donut — top plan (by MRR) gets the glow accent.
  const planDonut = useMemo(() => {
    const rows = (plans ?? []).filter((p) => p.users > 0);
    const topMrr = Math.max(...rows.map((p) => p.mrr), 0);
    let shade = 0;
    return rows.map((p) => {
      const isTop = p.mrr === topMrr && topMrr > 0;
      const color = isTop ? GLOW : DONUT_SHADES[shade++ % DONUT_SHADES.length];
      return { name: PLAN_LABEL[p.plan], users: p.users, mrr: p.mrr, color };
    });
  }, [plans]);

  const maxVolume = useMemo(
    () => Math.max(...(topUsers ?? []).map((u) => u.depositVolume), 1),
    [topUsers]
  );

  const recentLogs = useMemo(() => (logs ?? []).slice(0, 6), [logs]);

  if (ls || lg || lf) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Overview"
        subtitle="Platform-wide health — growth, revenue, conversion, and recent activity across every account."
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total users"
          value={stats?.totalUsers ?? 0}
          delta={`+${stats?.newUsersThisMonth ?? 0} this month`}
          deltaTone="up"
          icon={<Users size={18} />}
        />
        <KpiCard
          label="MRR"
          value={<Money minor={stats?.mrr ?? 0} />}
          hint="recurring"
          icon={<CircleDollarSign size={18} />}
        />
        <KpiCard
          label="Deposit volume"
          value={<Money minor={stats?.depositVolume ?? 0} />}
          hint={`${stats?.depositPaidCount ?? 0} paid`}
          icon={<Wallet size={18} />}
        />
        <KpiCard
          label="Platform conversion"
          value={`${stats?.platformConversionPct ?? 0}%`}
          hint="sent → deposit"
          icon={<Target size={18} />}
        />
        <KpiCard
          label="Median time-to-approval"
          value={stats ? formatHours(stats.medianTimeToApprovalHours) : "—"}
          delta="sent → approved"
          deltaTone="up"
          icon={<Clock size={18} />}
        />
      </div>

      {/* Growth chart + funnel */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <PanelHead eyebrow="Trailing 12 months" title="Revenue & new users" />
          <div className="h-72 px-3 py-5">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={growthSeries} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="adminRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GLOW} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={GLOW} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: AXIS, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="rev"
                  tick={{ fontSize: 11, fill: AXIS, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="users"
                  orientation="right"
                  tick={{ fontSize: 11, fill: AXIS, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(22,24,28,0.04)" }}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: AXIS, fontSize: 10, letterSpacing: "0.08em" }}
                  formatter={(v: number, name: string) =>
                    name === "revenue"
                      ? [`$${v.toLocaleString()}`, "Revenue"]
                      : [v, "New users"]
                  }
                />
                <Bar yAxisId="users" dataKey="newUsers" fill={INK} barSize={14} radius={[0, 0, 0, 0]} />
                <Area
                  yAxisId="rev"
                  type="monotone"
                  dataKey="revenue"
                  stroke={GLOW}
                  strokeWidth={2}
                  fill="url(#adminRev)"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-5 border-t border-line px-5 py-3">
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              <span className="h-0.5 w-4 rounded-full bg-glow" /> Revenue
            </span>
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              <span className="h-2.5 w-2.5" style={{ background: INK }} /> New users
            </span>
          </div>
        </Panel>

        {/* Conversion funnel — CSS bars, the win in glow */}
        <Panel>
          <PanelHead eyebrow="Platform funnel" title="Conversion" />
          <div className="space-y-5 p-5">
            {funnelBars.map((b) => (
              <div key={b.stage}>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    {b.stage}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-ink-soft">
                    {b.count.toLocaleString()}
                    {b.prior !== null && (
                      <span className="text-ink-faint"> · {b.prior}% of prior</span>
                    )}
                  </span>
                </div>
                <div className="h-9 overflow-hidden border border-line bg-paper">
                  <div
                    className="flex h-full items-center px-3 font-mono text-[11px] font-semibold tabular-nums text-paper transition-all duration-500"
                    style={{ width: `${Math.max(b.pct, 8)}%`, backgroundColor: b.fill }}
                  >
                    {b.pct}%
                  </div>
                </div>
              </div>
            ))}
            <p className="border-t border-line pt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
              Sent-to-deposit conversion{" "}
              <span className="font-semibold text-glow">{funnel?.sentToDepositPct ?? 0}%</span>
            </p>
          </div>
        </Panel>
      </div>

      {/* Plan breakdown + top users */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel>
          <PanelHead eyebrow="Billing mix" title="Plan breakdown" />
          <div className="flex flex-col items-center gap-4 p-5 sm:flex-row">
            <div className="h-52 w-full sm:w-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDonut}
                    dataKey="users"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={82}
                    paddingAngle={2}
                  >
                    {planDonut.map((p) => (
                      <Cell key={p.name} fill={p.color} stroke="#FFFFFF" strokeWidth={1.5} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, _n, item) => [
                      `${v} users · ${formatMoney(
                        (item?.payload as { mrr: number }).mrr
                      )}`,
                      (item?.payload as { name: string }).name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5">
              {planDonut.map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                    <span className="h-2.5 w-2.5" style={{ background: p.color }} />
                    {p.name}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold tabular-nums text-ink">{p.users}</span>
                    <Money minor={p.mrr} className="text-[11px] text-ink-faint" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHead eyebrow="By deposit volume" title="Top users" />
          <div className="divide-y divide-line">
            {(topUsers ?? []).map((u, i) => (
              <div key={u._id} className="flex items-center gap-4 px-5 py-3">
                <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-ink-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-grotesk text-sm font-medium text-ink">{u.businessName}</p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden bg-paper">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${Math.max((u.depositVolume / maxVolume) * 100, 3)}%`,
                        backgroundColor: i === 0 ? GLOW : INK_SOFT,
                      }}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <Money minor={u.depositVolume} className="text-sm text-ink" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                    {u.quoteCount} quotes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Recent platform events */}
      <div className="mt-6">
        <Panel>
          <PanelHead eyebrow="Audit log" title="Recent platform events" />
          <div className="divide-y divide-line">
            {recentLogs.map((e) => (
              <div key={e._id} className="flex items-start gap-3 px-5 py-3.5">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[e.severity]}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm text-ink-soft">
                    <span className="font-medium text-ink">{e.action}</span>
                    {e.target && <span className="text-ink-faint"> · {e.target}</span>}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                    {e.category} · {e.actor} · {timeAgo(e.ts)}
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
