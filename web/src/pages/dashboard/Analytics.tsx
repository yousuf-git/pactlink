import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Clock, TrendingDown, Eye, PenLine, CircleDollarSign } from "lucide-react";
import { PageHeader, KpiCard } from "@/components/dashboard/Shared";
import { Card, CardHeader } from "@/components/ui/Card";
import { LoadingBlock, EmptyState } from "@/components/ui/Misc";
import { useAsync } from "@/hooks/useAsync";
import { getFunnel, listQuotes } from "@/services/api";
import { formatHours, hoursBetween } from "@/lib/utils";

// Monochrome editorial palette — ink shades, the win (deposit_paid) in glow.
const STATUS_COLORS = ["#16181C", "#3A3D42", "#565A61", "#9A968E", "#C99A4B"];
const STATUS_NAMES = ["Draft", "Sent", "Viewed", "Approved", "Deposit paid"];

// Funnel bar fills — Viewed/Approved in ink, Deposit paid in glow.
const FUNNEL_FILLS = ["#3A3D42", "#16181C", "#C99A4B"];

export default function Analytics() {
  const { data: funnel, loading } = useAsync(getFunnel, []);
  const { data: quotes } = useAsync(listQuotes, []);

  // Funnel bars (Viewed → Approved → Deposit-Paid).
  const funnelBars = useMemo(() => {
    if (!funnel) return [];
    const total = Math.max(funnel.viewed, 1);
    return [
      { stage: "Viewed", count: funnel.viewed, pct: 100, prior: 100 },
      {
        stage: "Approved",
        count: funnel.approved,
        pct: Math.round((funnel.approved / total) * 100),
        prior: funnel.viewToApprovePct,
      },
      {
        stage: "Deposit paid",
        count: funnel.depositPaid,
        pct: Math.round((funnel.depositPaid / total) * 100),
        prior: funnel.approveToDepositPct,
      },
    ];
  }, [funnel]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of quotes ?? []) counts[q.status] = (counts[q.status] ?? 0) + 1;
    return ["draft", "sent", "viewed", "approved", "deposit_paid"].map((s, i) => ({
      name: STATUS_NAMES[i],
      value: counts[s] ?? 0,
      color: STATUS_COLORS[i],
    }));
  }, [quotes]);

  // Time-to-approval per quote (hours) for a small bar chart.
  const ttaSeries = useMemo(() => {
    return (quotes ?? [])
      .filter((q) => q.sentAt && q.approvedAt)
      .map((q) => ({
        name: q.title.length > 14 ? q.title.slice(0, 14) + "…" : q.title,
        hours: Number((hoursBetween(q.sentAt, q.approvedAt) ?? 0).toFixed(1)),
      }))
      .sort((a, b) => a.hours - b.hours);
  }, [quotes]);

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        eyebrow="Conversion · Velocity"
        title="Analytics"
        subtitle="The funnel from viewed to deposit-paid, and how fast quotes get approved."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Viewed" value={funnel?.viewed ?? 0} icon={<Eye size={18} />} />
        <KpiCard label="Approved" value={funnel?.approved ?? 0} icon={<PenLine size={18} />} delta={`${funnel?.viewToApprovePct ?? 0}% of viewed`} deltaTone="up" />
        <KpiCard label="Deposit paid" value={funnel?.depositPaid ?? 0} icon={<CircleDollarSign size={18} />} delta={`${funnel?.approveToDepositPct ?? 0}% of approved`} deltaTone="up" />
        <KpiCard
          label="Median time-to-approval"
          value={funnel ? formatHours(funnel.medianTimeToApprovalHours) : "—"}
          icon={<Clock size={18} />}
          delta="vs email-PDF baseline"
          deltaTone="up"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Conversion funnel — CSS bars in ink, the win in glow */}
        <Card>
          <CardHeader title="Conversion funnel" description="Viewed → Approved → Deposit paid" />
          <div className="space-y-5 p-6">
            {funnelBars.map((b, i) => (
              <div key={b.stage}>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    {b.stage}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-ink-soft">
                    {b.count}
                    {i > 0 && (
                      <span className="text-ink-faint"> · {b.prior}% of prior</span>
                    )}
                  </span>
                </div>
                <div className="h-9 overflow-hidden border border-line bg-paper">
                  <div
                    className="flex h-full items-center px-3 font-mono text-[11px] font-semibold tabular-nums text-paper transition-all duration-500"
                    style={{ width: `${Math.max(b.pct, 8)}%`, backgroundColor: FUNNEL_FILLS[i] }}
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
        </Card>

        {/* Quotes by stage — monochrome donut */}
        <Card>
          <CardHeader title="Quotes by stage" description="Current pipeline distribution" />
          <div className="flex flex-col items-center gap-4 p-6 sm:flex-row">
            <div className="h-56 w-full sm:w-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={84}
                    paddingAngle={2}
                  >
                    {statusDistribution.map((s) => (
                      <Cell key={s.name} fill={s.color} stroke="#FFFFFF" strokeWidth={1.5} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 0,
                      border: "1px solid #D9D5CC",
                      background: "#FFFFFF",
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                      color: "#16181C",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5">
              {statusDistribution.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                    <span className="h-2.5 w-2.5" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-ink">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Time-to-approval per quote */}
      <Card className="mt-6">
        <CardHeader
          title="Time-to-approval by quote"
          description="Hours from sent to approved — lower is better"
        />
        <div className="h-72 p-4">
          {ttaSeries.length === 0 ? (
            <EmptyState
              icon={<TrendingDown size={26} />}
              title="No approvals yet"
              description="Approved quotes will plot their sent-to-approved time here."
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ttaSeries} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DA" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9A968E", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9A968E", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
                <Tooltip
                  cursor={{ fill: "rgba(22,24,28,0.04)" }}
                  contentStyle={{
                    borderRadius: 0,
                    border: "1px solid #D9D5CC",
                    background: "#FFFFFF",
                    fontSize: 12,
                    fontFamily: "JetBrains Mono",
                    color: "#16181C",
                  }}
                  formatter={(v: number) => [`${v}h`, "Time to approval"]}
                />
                <Bar dataKey="hours" fill="#565A61" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </>
  );
}
