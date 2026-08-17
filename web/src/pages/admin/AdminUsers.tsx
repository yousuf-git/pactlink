import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  UserPlus,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Ban,
  Power,
  KeyRound,
  Layers,
  Building2,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { PageHeader, StatusPill, CARD_SHADOW } from "@/components/dashboard/Shared";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Money, LoadingBlock, EmptyState } from "@/components/ui/Misc";
import { useAsync } from "@/hooks/useAsync";
import {
  listPlatformUsers,
  getPlatformUser,
  setUserStatus,
  setUserPlan,
  resetUserPassword,
  createPlatformUser,
  listAuditLogs,
} from "@/services/adminApi";
import { useToast } from "@/context/ToastContext";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import type {
  PlatformUser,
  PlatformUserDetail,
  PlatformPlan,
  AccountStatus,
  AuditLogEntry,
} from "@/lib/types";

// ── Chip styling — monochrome editorial: status + plan as mono bordered chips ──

const STATUS_CHIP: Record<AccountStatus, { dot: string; cls: string }> = {
  active: { dot: "bg-glow", cls: "border-glow/50 bg-glow/[0.08] text-[#8a6a2e]" },
  trial: { dot: "bg-ink-soft", cls: "border-ink/25 text-ink-soft" },
  suspended: { dot: "bg-danger", cls: "border-danger/40 bg-danger/[0.06] text-danger" },
  churned: { dot: "bg-ink-faint", cls: "border-ink/15 text-ink-faint" },
};

function StatusChip({ status }: { status: AccountStatus }) {
  const s = STATUS_CHIP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] lowercase tracking-[0.04em]",
        s.cls
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {status}
    </span>
  );
}

const PLAN_CHIP: Record<PlatformPlan, string> = {
  trial: "border-ink/15 text-ink-faint",
  starter: "border-ink/25 text-ink-soft",
  growth: "border-ink/40 text-ink",
  scale: "border-glow/50 bg-glow/[0.08] text-[#8a6a2e]",
};

function PlanChip({ plan }: { plan: PlatformPlan }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
        PLAN_CHIP[plan]
      )}
    >
      {plan}
    </span>
  );
}

// ── Filter + sort vocab ─────────────────────────────────────────────────────

const PLANS: PlatformPlan[] = ["trial", "starter", "growth", "scale"];
const STATUSES: AccountStatus[] = ["active", "trial", "suspended", "churned"];
const PAGE_SIZE = 10;

type SortKey = "depositVolume" | "quoteCount" | "createdAt" | "lastActiveAt";

// Active filter pill — bg-ink text-paper when selected, outlined otherwise.
function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/20 bg-surface text-ink-soft hover:border-ink hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

// Mono uppercase column head; sortable heads toggle direction.
function Th({
  children,
  align = "left",
  sortKey,
  activeSort,
  dir,
  onSort,
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  sortKey?: SortKey;
  activeSort?: SortKey;
  dir?: "asc" | "desc";
  onSort?: (k: SortKey) => void;
  className?: string;
}) {
  const sortable = !!sortKey && !!onSort;
  const isActive = sortable && sortKey === activeSort;
  return (
    <th
      className={cn(
        "px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint",
        align === "right" ? "text-right" : "text-left",
        className
      )}
    >
      {sortable ? (
        <button
          onClick={() => onSort!(sortKey!)}
          className={cn(
            "inline-flex items-center gap-1 transition-colors hover:text-ink",
            align === "right" && "flex-row-reverse",
            isActive && "text-ink"
          )}
        >
          {children}
          {isActive &&
            (dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export default function AdminUsers() {
  const { success, error } = useToast();
  const { data: users, loading, reload } = useAsync(listPlatformUsers, []);

  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<PlatformPlan | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("depositVolume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const rows = useMemo(() => {
    let out = users ?? [];
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.businessName.toLowerCase().includes(q)
      );
    }
    if (planFilter !== "all") out = out.filter((u) => u.plan === planFilter);
    if (statusFilter !== "all") out = out.filter((u) => u.status === statusFilter);

    const dirMul = sortDir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      let av: number;
      let bv: number;
      if (sortKey === "createdAt" || sortKey === "lastActiveAt") {
        av = new Date(a[sortKey]).getTime();
        bv = new Date(b[sortKey]).getTime();
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      return (av - bv) * dirMul;
    });
    return out;
  }, [users, query, planFilter, statusFilter, sortKey, sortDir]);

  // Reset to page 1 when the filtered set changes shape.
  useEffect(() => {
    setPage(1);
  }, [query, planFilter, statusFilter, sortKey, sortDir]);

  const pageRows = useMemo(() => paginate(rows, page, PAGE_SIZE), [rows, page]);

  // Optimistic patch into the loaded list so a row reflects the mutation
  // immediately; a reload then re-syncs derived aggregates (e.g. mrr).
  const patchUser = (updated: PlatformUser) => {
    if (!users) return;
    const idx = users.findIndex((u) => u._id === updated._id);
    if (idx >= 0) users[idx] = updated;
    reload();
  };

  const total = users?.length ?? 0;

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Users"
        subtitle={`${total} tenant${total === 1 ? "" : "s"} across every plan — search, filter, and manage accounts.`}
        action={
          <button
            onClick={() => setCreateOpen(true)}
            className="btn btn-solid btn-sm"
          >
            <UserPlus size={14} /> Create user
          </button>
        }
      />

      {/* ── Control bar ── */}
      <div className="mb-5 space-y-4">
        <div className="relative max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search business, owner, email…"
            className="h-10 w-full rounded-none border border-ink/20 bg-surface pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Plan
            </span>
            <Pill active={planFilter === "all"} onClick={() => setPlanFilter("all")}>
              All
            </Pill>
            {PLANS.map((p) => (
              <Pill key={p} active={planFilter === p} onClick={() => setPlanFilter(p)}>
                {p}
              </Pill>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Status
            </span>
            <Pill active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              All
            </Pill>
            {STATUSES.map((s) => (
              <Pill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {s}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      {/* ── Users table ── */}
      {rows.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="No users match"
          description="Adjust the search or clear the plan and status filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto border border-line bg-surface" style={{ boxShadow: CARD_SHADOW }}>
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead className="border-b border-line bg-paper-dim/40">
                <tr>
                  <Th>Tenant</Th>
                  <Th>Plan</Th>
                  <Th>Status</Th>
                  <Th align="right">Clients</Th>
                  <Th
                    align="right"
                    sortKey="quoteCount"
                    activeSort={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  >
                    Quotes
                  </Th>
                  <Th
                    align="right"
                    sortKey="depositVolume"
                    activeSort={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  >
                    Deposit vol.
                  </Th>
                  <Th align="right">MRR</Th>
                  <Th
                    sortKey="createdAt"
                    activeSort={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  >
                    Joined
                  </Th>
                  <Th
                    sortKey="lastActiveAt"
                    activeSort={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  >
                    Last active
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageRows.map((u) => (
                  <tr
                    key={u._id}
                    onClick={() => setSelected(u._id)}
                    className="cursor-pointer transition-colors hover:bg-paper-dim/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-ink font-headline text-[13px] font-bold text-paper">
                          {u.businessName
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-headline text-[14px] font-semibold tracking-[-0.01em] text-ink">
                            {u.businessName}
                          </p>
                          <p className="truncate font-sans text-xs text-ink-soft">
                            {u.name} · {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PlanChip plan={u.plan} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-soft">
                      {u.clientCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-soft">
                      {u.quoteCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money
                        minor={u.depositVolume}
                        className="text-[13px] font-semibold text-ink"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money minor={u.mrr} className="text-[13px] text-ink-soft" />
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-faint">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-faint">
                      {timeAgo(u.lastActiveAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            className="mt-5"
            total={rows.length}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}

      {/* ── Create user modal ── */}
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => reload()}
        onSuccess={success}
        onError={error}
      />

      {/* ── Detail drawer ── */}
      <UserDrawer
        userId={selected}
        onClose={() => setSelected(null)}
        onPatched={patchUser}
        onSuccess={success}
        onError={error}
      />
    </>
  );
}

// ── Create user modal ───────────────────────────────────────────────────────

const PLAN_LABEL: Record<PlatformPlan, string> = {
  trial: "Trial",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};
const PLAN_FROM_LABEL = Object.fromEntries(
  PLANS.map((p) => [PLAN_LABEL[p], p])
) as Record<string, PlatformPlan>;

function CreateUserModal({
  open,
  onClose,
  onCreated,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onSuccess: (title: string, message?: string) => void;
  onError: (title: string, message?: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [plan, setPlan] = useState<PlatformPlan>("trial");
  const [busy, setBusy] = useState(false);

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setBusinessName("");
      setPlan("trial");
      setBusy(false);
    }
  }, [open]);

  const valid =
    name.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    businessName.trim().length > 0;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const created = await createPlatformUser({
        name: name.trim(),
        email: email.trim(),
        businessName: businessName.trim(),
        plan,
      });
      onCreated();
      onSuccess("Tenant created", `${created.businessName} · ${created.plan}`);
      onClose();
    } catch (e) {
      onError("Couldn't create user", e instanceof Error ? e.message : "");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create tenant"
      description="Provision a new account on the platform."
      footer={
        <>
          <button onClick={onClose} className="btn btn-outline btn-sm" disabled={busy}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!valid || busy}
            className="btn btn-solid btn-sm disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create tenant"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Owner name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Bennett"
            className="h-10 w-full border border-ink/20 bg-paper px-3 font-sans text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@business.com"
            className="h-10 w-full border border-ink/20 bg-paper px-3 font-mono text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </Field>
        <Field label="Business name">
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Bennett Studio"
            className="h-10 w-full border border-ink/20 bg-paper px-3 font-sans text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </Field>
        <Field label="Plan">
          <SelectMenu
            value={PLAN_LABEL[plan]}
            onChange={(v) => setPlan(PLAN_FROM_LABEL[v] ?? "trial")}
            options={PLANS.map((p) => PLAN_LABEL[p])}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ── Drawer: tenant stats + admin account controls (with confirmation) ───────

// A pending account action that requires explicit confirmation.
type ConfirmAction =
  | { kind: "disable" }
  | { kind: "suspend" }
  | { kind: "activate" }
  | { kind: "reset" }
  | { kind: "plan"; plan: PlatformPlan };

function UserDrawer({
  userId,
  onClose,
  onPatched,
  onSuccess,
  onError,
}: {
  userId: string | null;
  onClose: () => void;
  onPatched: (u: PlatformUser) => void;
  onSuccess: (title: string, message?: string) => void;
  onError: (title: string, message?: string) => void;
}) {
  const navigate = useNavigate();
  const { data, loading, reload } = useAsync<PlatformUserDetail | null>(
    () => (userId ? getPlatformUser(userId) : Promise.resolve(null)),
    [userId]
  );

  // Locally-tracked copy so the panel STAYS OPEN and refreshes after an action.
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  useEffect(() => {
    setUser(data?.user ?? null);
    setConfirm(null);
  }, [data]);

  // Recent activity = most recent 5 audit logs for this tenant (by actor email).
  const { data: tenantLogs } = useAsync<AuditLogEntry[]>(
    () =>
      data?.user
        ? listAuditLogs({ actor: data.user.email })
        : Promise.resolve([]),
    [data?.user?._id]
  );

  const runStatus = async (status: AccountStatus, label: string) => {
    if (!user) return;
    setBusy(true);
    try {
      const updated = await setUserStatus(user._id, status);
      setUser(updated);
      onPatched(updated);
      reload();
      onSuccess(label, updated.businessName);
    } catch (e) {
      onError("Couldn't update status", e instanceof Error ? e.message : "");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const runPlan = async (plan: PlatformPlan) => {
    if (!user || plan === user.plan) return;
    setBusy(true);
    try {
      const updated = await setUserPlan(user._id, plan);
      setUser(updated);
      onPatched(updated);
      reload();
      onSuccess("Plan changed", `${updated.businessName} → ${plan}`);
    } catch (e) {
      onError("Couldn't change plan", e instanceof Error ? e.message : "");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const runReset = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await resetUserPassword(user._id);
      onSuccess("Password reset sent", user.email);
    } catch (e) {
      onError("Couldn't reset password", e instanceof Error ? e.message : "");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  // Map a confirmed action to its effect. disable→churned, suspend→suspended.
  const runConfirmed = () => {
    if (!confirm) return;
    switch (confirm.kind) {
      case "disable":
        return runStatus("churned", "Account disabled");
      case "suspend":
        return runStatus("suspended", "Account suspended");
      case "activate":
        return runStatus("active", "Account activated");
      case "reset":
        return runReset();
      case "plan":
        return runPlan(confirm.plan);
    }
  };

  const confirmCopy = (a: ConfirmAction): { title: string; body: string } => {
    switch (a.kind) {
      case "disable":
        return {
          title: "Disable this account?",
          body: "The tenant is marked churned and billing stops (MRR → $0). Data is retained.",
        };
      case "suspend":
        return {
          title: "Suspend this account?",
          body: "The tenant is locked out but their plan and data are kept (billing frozen, recoverable).",
        };
      case "activate":
        return {
          title: "Reactivate this account?",
          body: "Restores access and resumes billing at the tenant's current plan.",
        };
      case "reset":
        return {
          title: "Reset owner password?",
          body: "Sends a password-reset email to the tenant owner. Their current password keeps working until they reset.",
        };
      case "plan":
        return {
          title: `Change plan to ${a.plan}?`,
          body: "Billing MRR follows the new plan immediately (unless the account is churned).",
        };
    }
  };

  return (
    <Drawer open={!!userId} onClose={onClose} title={user?.businessName ?? "Tenant"}>
      {loading || !data || !user ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-6">
          {/* Tenant header */}
          <div className="flex items-start justify-between gap-3 border-b border-line pb-5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-sans text-sm text-ink-soft">
                <Building2 size={13} className="shrink-0 text-ink-faint" />
                {user.name}
              </p>
              <p className="mt-1 flex items-center gap-1.5 truncate font-mono text-xs text-ink-soft">
                <Mail size={13} className="shrink-0 text-ink-faint" />
                {user.email}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <PlanChip plan={user.plan} />
              <StatusChip status={user.status} />
            </div>
          </div>

          {/* ── Stats (KPIs, read-only) ── */}
          <Section label="Stats">
            <div className="grid grid-cols-2 gap-px border border-line bg-line">
              <StatLink
                label="Clients"
                value={user.clientCount}
                onClick={() => navigate(`/admin/clients?user=${user._id}`)}
              />
              <StatLink
                label="Quotes"
                value={user.quoteCount}
                onClick={() => navigate(`/admin/quotes?user=${user._id}`)}
              />
              <Stat label="Deposit volume" value={<Money minor={user.depositVolume} />} />
              <Stat label="MRR" value={<Money minor={user.mrr} />} />
              <Stat label="Conversion" value={`${user.conversionPct}%`} />
              <Stat
                label="Status / plan"
                value={
                  <span className="flex flex-wrap items-center gap-1.5">
                    <StatusChip status={user.status} />
                    <PlanChip plan={user.plan} />
                  </span>
                }
              />
              <Stat label="Joined" value={formatDate(user.createdAt)} />
              <Stat label="Last active" value={timeAgo(user.lastActiveAt)} />
            </div>
          </Section>

          {/* ── Recent activity (5 most recent logs) ── */}
          <Section
            label="Recent activity"
            action={
              <button
                onClick={() => navigate(`/admin/logs?user=${user._id}`)}
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:text-ink"
              >
                View logs <ArrowUpRight size={12} />
              </button>
            }
          >
            {(tenantLogs ?? []).length === 0 ? (
              <p className="border border-line bg-surface px-3 py-3 font-mono text-[11px] text-ink-faint">
                No recent audit events for this tenant.
              </p>
            ) : (
              <ul className="space-y-2.5 border-l border-line pl-4">
                {(tenantLogs ?? []).slice(0, 5).map((a) => (
                  <li key={a._id} className="relative">
                    <span className="absolute -left-[1.1rem] top-1.5 h-1.5 w-1.5 rounded-full bg-ink-faint" />
                    <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink">
                      {a.action}
                      <span className="text-ink-faint"> · {a.category}</span>
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint">
                      {timeAgo(a.ts)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* ── Account controls (each confirms before acting) ── */}
          <Section label="Account controls">
            {confirm ? (
              <ConfirmCard
                {...confirmCopy(confirm)}
                busy={busy}
                onCancel={() => setConfirm(null)}
                onConfirm={runConfirmed}
              />
            ) : (
              <div className="space-y-3 border border-line bg-paper p-4" style={{ boxShadow: CARD_SHADOW }}>
                <div>
                  <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    Account
                  </p>
                  {user.status === "suspended" || user.status === "churned" ? (
                    <button
                      disabled={busy}
                      onClick={() => setConfirm({ kind: "activate" })}
                      className="btn btn-solid btn-sm w-full disabled:opacity-50"
                    >
                      <Power size={14} /> Activate account
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={busy}
                        onClick={() => setConfirm({ kind: "suspend" })}
                        className="btn btn-sm border border-danger bg-danger font-grotesk text-paper transition-colors hover:bg-danger/90 disabled:opacity-50"
                      >
                        <Ban size={14} /> Suspend
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setConfirm({ kind: "disable" })}
                        className="btn btn-sm border border-ink/30 bg-surface font-grotesk text-ink transition-colors hover:border-ink disabled:opacity-50"
                      >
                        <Power size={14} /> Disable
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    Security
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => setConfirm({ kind: "reset" })}
                    className="btn btn-sm w-full border border-ink/20 bg-surface font-grotesk text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
                  >
                    <KeyRound size={14} /> Reset password
                  </button>
                </div>

                <div>
                  <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    <Layers size={12} /> Change plan
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PLANS.map((p) => (
                      <button
                        key={p}
                        disabled={busy || p === user.plan}
                        onClick={() => setConfirm({ kind: "plan", plan: p })}
                        className={cn(
                          "border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed",
                          p === user.plan
                            ? "border-ink bg-ink text-paper"
                            : "border-ink/20 bg-surface text-ink-soft hover:border-ink hover:text-ink disabled:opacity-50"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Quotes preview (recent quotes for context) */}
          <Section label={`Quotes (${data.quotes.length})`}>
            <ul className="divide-y divide-line border border-line bg-surface">
              {data.quotes.slice(0, 5).map((q) => (
                <li key={q._id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-headline text-[13px] font-semibold tracking-[-0.01em] text-ink">
                      {q.title}
                    </p>
                    <Money
                      minor={q.total}
                      currency={q.currency}
                      className="text-[12px] text-ink-soft"
                    />
                  </div>
                  <StatusPill status={q.status} className="shrink-0" />
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </Drawer>
  );
}

// Inline confirmation card shown in place of the controls until resolved.
function ConfirmCard({
  title,
  body,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="border border-danger/40 bg-danger/[0.04] p-4" style={{ boxShadow: CARD_SHADOW }}>
      <p className="flex items-center gap-2 font-headline text-sm font-semibold text-ink">
        <AlertTriangle size={15} className="text-danger" />
        {title}
      </p>
      <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-ink-soft">{body}</p>
      <div className="mt-4 flex gap-2">
        <button
          disabled={busy}
          onClick={onConfirm}
          className="btn btn-sm flex-1 border border-ink bg-ink font-grotesk text-paper transition-colors hover:bg-ink/85 disabled:opacity-50"
        >
          {busy ? "Working…" : "Confirm"}
        </button>
        <button
          disabled={busy}
          onClick={onCancel}
          className="btn btn-sm flex-1 border border-ink/20 bg-surface font-grotesk text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          {label}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-surface p-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
      <p className="mt-1 font-headline text-base font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}

// Stat tile that doubles as a redirect to a filtered cross-tenant page.
function StatLink({
  label,
  value,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col bg-surface p-3 text-left transition-colors hover:bg-paper-dim/60"
    >
      <span className="flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
        <ArrowUpRight size={13} className="text-ink-faint transition-colors group-hover:text-ink" />
      </span>
      <span className="mt-1 font-headline text-base font-bold tabular-nums text-ink">{value}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </label>
      {children}
    </div>
  );
}
