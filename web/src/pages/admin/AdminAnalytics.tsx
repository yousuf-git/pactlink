import { useMemo } from "react";
import {
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  CircleDollarSign,
  Activity as ActivityIcon,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";
import { PageHeader, KpiCard, Panel } from "@/components/dashboard/Shared";
import { LoadingBlock, EmptyState, Money } from "@/components/ui/Misc";
import { useAsync } from "@/hooks/useAsync";
import {
  getPlatformStats,
  getPlatformGrowth,
  getPlatformFunnel,
  getPlanBreakdown,
  getTopUsers,
  listPlatformUsers,
} from "@/services/adminApi";
import type { AccountStatus, PlatformPlan } from "@/lib/types";

// ── Monochrome editorial chart palette (critical: NO blue/green/rainbow) ────
const INK = "#16181C";
const INK_MID = "#3A3D42";
const INK_SOFT = "#565A61";
const INK_FAINT = "#9A968E";
const INK_PALE = "#C9C4BA";
const GLOW = "#C99A4B"; // the win / primary metric
const DANGER = "#B23A33";
const GRID = "#E5E2DA";
const AXIS = "#9A968E";

// Donut slice palette — top/win slice gets the glow.
const SLICE_PALETTE = [INK, INK_MID, INK_SOFT, INK_FAINT, INK_PALE];

// Shared tooltip style — white card, 1px line, sharp, mono labels.
const TOOLTIP_STYLE = {
  borderRadius: 0,
  border: "1px solid #D9D5CC",
  background: "#FFFFFF",
  boxShadow: "0 1px 2px rgba(22,24,28,0.05)",
  fontSize: 12,
  fontFamily: "JetBrains Mono",
  color: INK,
} as const;

const TOOLTIP_LABEL = { color: AXIS, fontSize: 10, letterSpacing: "0.08em" } as const;

const AXIS_TICK = { fontSize: 11, fill: AXIS, fontFamily: "JetBrains Mono" } as const;

const PLAN_LABEL: Record<PlatformPlan, string> = {
  trial: "Trial",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

const STATUS_LABEL: Record<AccountStatus, string> = {
  active: "Active",
  trial: "Trial",
  suspended: "Suspended",
  churned: "Churned",
};

const STATUS_COLOR: Record<AccountStatus, string> = {
  active: INK,
  trial: INK_SOFT,
  suspended: DANGER,
  churned: INK_FAINT,
};

const STATUS_ORDER: AccountStatus[] = ["active", "trial", "suspended", "churned"];

// ── Section header inside white panels ──────────────────────────────────────
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
      <span className="h-0.5 w-4 rounded-full" style={{ background: color }} /> {label}
    </span>
  );
}

const fmtK = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`);

export default function AdminAnalytics() {
  const { data: stats, loading: lStats } = useAsync(getPlatformStats, []);
  const { data: growth, loading: lGrowth } = useAsync(getPlatformGrowth, []);
  const { data: funnel, loading: lFunnel } = useAsync(getPlatformFunnel, []);
  const { data: plans, loading: lPlans } = useAsync(getPlanBreakdown, []);
  const { data: topUsers, loading: lTop } = useAsync(() => getTopUsers(8), []);
  const { data: users, loading: lUsers } = useAsync(listPlatformUsers, []);

  // Revenue trend (minor → dollars) over the growth window.
  const revenueSeries = useMemo(
    () =>
      (growth ?? []).map((g) => ({
        period: g.period,
        revenue: g.revenue / 100,
      })),
    [growth]
  );

  // User growth: newUsers bars + cumulative totalUsers line.
  const userGrowthSeries = useMemo(
    () =>
      (growth ?? []).map((g) => ({
        period: g.period,
        newUsers: g.newUsers,
        totalUsers: g.totalUsers,
      })),
    [growth]
  );

  // Quotes per month.
  const quotesSeries = useMemo(
    () => (growth ?? []).map((g) => ({ period: g.period, quotes: g.quotes })),
    [growth]
  );

  // Conversion funnel as horizontal bars with pct-of-sent.
  const funnelBars = useMemo(() => {
    if (!funnel) return [];
    const base = Math.max(funnel.sent, 1);
    return [
      { stage: "Sent", count: funnel.sent, fill: INK_MID },
      { stage: "Viewed", count: funnel.viewed, fill: INK_SOFT },
      { stage: "Approved", count: funnel.approved, fill: INK },
      { stage: "Deposit paid", count: funnel.depositPaid, fill: GLOW },
    ].map((b) => ({ ...b, pct: Math.round((b.count / base) * 100) }));
  }, [funnel]);

  // MRR by plan (minor → dollars); scale is the win slice/bar.
  const planMrrSeries = useMemo(
    () =>
      (plans ?? []).map((p) => ({
        plan: PLAN_LABEL[p.plan],
        mrr: p.mrr / 100,
        fill: p.plan === "scale" ? GLOW : INK_SOFT,
      })),
    [plans]
  );

  // Plan distribution donut (users per plan); largest slice → glow.
  const planDistribution = useMemo(() => {
    const rows = (plans ?? []).filter((p) => p.users > 0);
    const maxUsers = Math.max(0, ...rows.map((p) => p.users));
    return rows.map((p, i) => ({
      name: PLAN_LABEL[p.plan],
      value: p.users,
      color: p.users === maxUsers && maxUsers > 0 ? GLOW : SLICE_PALETTE[i % SLICE_PALETTE.length],
    }));
  }, [plans]);

  // Top users by deposit volume (minor → dollars).
  const topUserBars = useMemo(
    () =>
      (topUsers ?? []).map((u, i) => ({
        name: u.businessName,
        deposits: u.depositVolume / 100,
        fill: i === 0 ? GLOW : INK_SOFT,
      })),
    [topUsers]
  );

  // Account status distribution from listPlatformUsers.
  const statusDistribution = useMemo(() => {
    const counts: Record<AccountStatus, number> = {
      active: 0,
      trial: 0,
      suspended: 0,
      churned: 0,
    };
    for (const u of users ?? []) counts[u.status] += 1;
    return STATUS_ORDER.map((s) => ({
      name: STATUS_LABEL[s],
      value: counts[s],
      color: STATUS_COLOR[s],
    })).filter((s) => s.value > 0);
  }, [users]);

  const loading = lStats || lGrowth || lFunnel || lPlans || lTop || lUsers;
  if (loading) return <LoadingBlock label="Loading platform analytics…" />;

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Analytics"
        subtitle="Revenue, growth, conversion, and account health across every tenant on PactLink."
      />

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total users"
          value={stats?.totalUsers ?? 0}
          icon={<Users size={18} />}
          delta={`+${stats?.newUsersThisMonth ?? 0} this month`}
          deltaTone="up"
        />
        <KpiCard
          label="Monthly recurring revenue"
          value={<Money minor={stats?.mrr ?? 0} className="font-headline" />}
          icon={<DollarSign size={18} />}
          hint="across all plans"
        />
        <KpiCard
          label="Platform conversion"
          value={`${stats?.platformConversionPct ?? 0}%`}
          icon={<TrendingUp size={18} />}
          delta="sent → deposit paid"
          deltaTone="up"
        />
        <KpiCard
          label="Deposit volume"
          value={<Money minor={stats?.depositVolume ?? 0} className="font-headline" />}
          icon={<CircleDollarSign size={18} />}
          hint={`${stats?.depositPaidCount ?? 0} deposits`}
        />
      </div>

      {/* ── Revenue trend (full width) ────────────────────────────────────── */}
      <Panel className="mt-6">
        <PanelHead
          eyebrow="Deposits collected · last 12 months"
          title="Revenue trend"
          action={<LegendDot color={GLOW} label="Revenue" />}
        />
        <div className="h-72 px-3 py-5">
          {revenueSeries.length === 0 ? (
            <EmptyState
              icon={<DollarSign size={26} />}
              title="No revenue yet"
              description="Monthly deposit revenue will plot here once tenants collect deposits."
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
                <defs>
                  <linearGradient id="adminRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GLOW} stopOpacity={0.24} />
                    <stop offset="100%" stopColor={GLOW} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtK}
                  width={48}
                />
                <Tooltip
                  cursor={{ stroke: "#D9D5CC", strokeWidth: 1 }}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={GLOW}
                  strokeWidth={2}
                  fill="url(#adminRev)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Panel>

      {/* ── User growth + conversion funnel ───────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHead
            eyebrow="Signups & cumulative base"
            title="User growth"
            action={
              <div className="flex items-center gap-4">
                <LegendDot color={INK_SOFT} label="New" />
                <LegendDot color={INK} label="Total" />
              </div>
            }
          />
          <div className="h-72 px-3 py-5">
            {userGrowthSeries.length === 0 ? (
              <EmptyState icon={<Users size={26} />} title="No growth data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={userGrowthSeries}
                  margin={{ top: 8, right: 12, bottom: 0, left: -4 }}
                >
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(22,24,28,0.04)" }}
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL}
                  />
                  <Bar yAxisId="left" dataKey="newUsers" name="New users" fill={INK_SOFT} maxBarSize={26} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalUsers"
                    name="Total users"
                    stroke={INK}
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHead eyebrow="Sent → deposit paid" title="Conversion funnel" />
          <div className="space-y-5 p-6">
            {funnelBars.length === 0 ? (
              <EmptyState icon={<TrendingUp size={26} />} title="No funnel data" />
            ) : (
              <>
                {funnelBars.map((b) => (
                  <div key={b.stage}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                        {b.stage}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-ink-soft">
                        {b.count.toLocaleString()}
                        <span className="text-ink-faint"> · {b.pct}% of sent</span>
                      </span>
                    </div>
                    <div className="h-9 overflow-hidden border border-line bg-paper">
                      <div
                        className="flex h-full items-center px-3 font-mono text-[11px] font-semibold tabular-nums text-paper transition-all duration-500"
                        style={{ width: `${Math.max(b.pct, 6)}%`, backgroundColor: b.fill }}
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
              </>
            )}
          </div>
        </Panel>
      </div>

      {/* ── MRR by plan + plan distribution ───────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHead
            eyebrow="Billing"
            title="MRR by plan"
            action={<LegendDot color={GLOW} label="Scale" />}
          />
          <div className="h-64 px-3 py-5">
            {planMrrSeries.length === 0 ? (
              <EmptyState icon={<BarChart3 size={26} />} title="No billing data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planMrrSeries} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="plan" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtK}
                    width={48}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(22,24,28,0.04)" }}
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, "MRR"]}
                  />
                  <Bar dataKey="mrr" maxBarSize={64}>
                    {planMrrSeries.map((p) => (
                      <Cell key={p.plan} fill={p.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHead eyebrow="Tenants per plan" title="Plan distribution" />
          <div className="flex flex-col items-center gap-4 p-6 sm:flex-row">
            {planDistribution.length === 0 ? (
              <div className="w-full">
                <EmptyState icon={<PieIcon size={26} />} title="No plan data" />
              </div>
            ) : (
              <>
                <div className="h-52 w-full sm:w-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={2}
                      >
                        {planDistribution.map((s) => (
                          <Cell key={s.name} fill={s.color} stroke="#FFFFFF" strokeWidth={1.5} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5 self-stretch">
                  {planDistribution.map((s) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                        <span className="h-2.5 w-2.5" style={{ background: s.color }} />
                        {s.name}
                      </span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Panel>
      </div>

      {/* ── Top users by deposit volume + account status ──────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel>
          <PanelHead
            eyebrow="Lifetime deposits collected"
            title="Top tenants by deposit volume"
            action={<LegendDot color={GLOW} label="Leader" />}
          />
          <div className="h-80 px-3 py-5">
            {topUserBars.length === 0 ? (
              <EmptyState icon={<CircleDollarSign size={26} />} title="No deposits yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topUserBars}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 0, left: 12 }}
                >
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtK}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ ...AXIS_TICK, fill: INK_SOFT }}
                    axisLine={false}
                    tickLine={false}
                    width={132}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(22,24,28,0.04)" }}
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Deposits"]}
                  />
                  <Bar dataKey="deposits" maxBarSize={22}>
                    {topUserBars.map((u) => (
                      <Cell key={u.name} fill={u.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHead eyebrow="Account health" title="Status distribution" />
          <div className="flex flex-col items-center gap-4 p-6">
            {statusDistribution.length === 0 ? (
              <div className="w-full">
                <EmptyState icon={<ActivityIcon size={26} />} title="No accounts" />
              </div>
            ) : (
              <>
                <div className="h-52 w-full sm:w-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={2}
                      >
                        {statusDistribution.map((s) => (
                          <Cell key={s.name} fill={s.color} stroke="#FFFFFF" strokeWidth={1.5} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid w-full grid-cols-2 gap-2.5">
                  {statusDistribution.map((s) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                        <span className="h-2.5 w-2.5" style={{ background: s.color }} />
                        {s.name}
                      </span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Panel>
      </div>

      {/* ── Quotes per month (full width) ─────────────────────────────────── */}
      <Panel className="mt-6">
        <PanelHead
          eyebrow="Quotes created · last 12 months"
          title="Quote volume"
          action={<LegendDot color={INK} label="Quotes" />}
        />
        <div className="h-64 px-3 py-5">
          {quotesSeries.length === 0 ? (
            <EmptyState icon={<FileText size={26} />} title="No quote data" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quotesSeries} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="period" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  cursor={{ fill: "rgba(22,24,28,0.04)" }}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL}
                  formatter={(v: number) => [v.toLocaleString(), "Quotes"]}
                />
                <Bar dataKey="quotes" fill={INK} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Panel>
    </>
  );
}
