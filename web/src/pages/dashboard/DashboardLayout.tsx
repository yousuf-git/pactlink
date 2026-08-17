import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Kanban,
  BarChart3,
  Webhook,
  Users,
  Settings as SettingsIcon,
  Bell,
  Search,
  LogOut,
  Menu,
  Beaker,
  ChevronLeft,
  ChevronUp,
  Plus,
  Send,
  Eye,
  CheckCircle2,
  CreditCard,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo, Mark } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { listNotifications } from "@/services/api";
import type { NotificationTemplate } from "@/lib/types";
import { SANDBOX_WARN_MS } from "@/config/env";
import { cn, timeAgo } from "@/lib/utils";

const SIDEBAR_EASE = [0.16, 1, 0.3, 1] as const;

const NOTIF_META: Record<
  NotificationTemplate,
  { label: string; icon: LucideIcon }
> = {
  quote_sent: { label: "Quote sent", icon: Send },
  quote_viewed: { label: "Quote viewed", icon: Eye },
  quote_approved: { label: "Quote approved", icon: CheckCircle2 },
  deposit_paid: { label: "Deposit paid", icon: CreditCard },
  balance_invoice: { label: "Balance invoice", icon: Receipt },
  payment_failed: { label: "Payment failed", icon: AlertTriangle },
};

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/quotes", label: "Quotes", icon: FileText },
  { to: "/dashboard/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/dashboard/clients", label: "Clients", icon: Users },
  { to: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

export default function DashboardLayout() {
  const { user, logout, isSandbox, expiresAt } = useAuth();
  const { warning, info } = useToast();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useAsync(listNotifications);
  const notifList = (notifications ?? []).slice(0, 8);

  // Close notifications on outside click + Esc (mirrors profile popover).
  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen]);

  // Sandbox expiry warning toast at 15 minutes before expiry.
  useEffect(() => {
    if (!isSandbox || !expiresAt) return;
    const warnAt = expiresAt - SANDBOX_WARN_MS - Date.now();
    if (warnAt <= 0) return;
    const t = setTimeout(
      () =>
        warning(
          "Sandbox expiring soon",
          "Your sandbox session ends in 15 minutes. Changes will be discarded."
        ),
      warnAt
    );
    return () => clearTimeout(t);
  }, [isSandbox, expiresAt, warning]);

  const initials = (user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navItem = (collapsedView: boolean) =>
    ({ isActive }: { isActive: boolean }) =>
      cn(
        "group relative flex items-center gap-3 px-3 py-2.5 font-grotesk text-sm transition-colors",
        collapsedView && "justify-center px-0",
        isActive
          ? "bg-paper-dim font-medium text-ink"
          : "text-ink-soft hover:bg-paper-dim/60 hover:text-ink"
      );

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ── Sidebar (desktop) ── */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 252 }}
        transition={{ duration: 0.3, ease: SIDEBAR_EASE }}
        className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface lg:flex"
      >
        <div className={cn("flex h-16 items-center border-b border-line px-4", collapsed ? "justify-center" : "justify-between")}>
          <button onClick={() => navigate("/dashboard")} aria-label="PactLink dashboard" className="flex items-center gap-2">
            <Mark size={28} />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.2, ease: SIDEBAR_EASE }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <Logo />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 text-ink-faint transition-colors hover:text-ink"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto mt-3 p-1.5 text-ink-faint transition-colors hover:text-ink"
            aria-label="Expand sidebar"
          >
            <ChevronLeft size={16} className="rotate-180" />
          </button>
        )}

        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={navItem(collapsed)} title={collapsed ? n.label : undefined}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-0 h-full w-[3px] bg-glow" />}
                  <n.icon size={18} className={cn("shrink-0", isActive ? "text-ink" : "text-ink-faint group-hover:text-ink")} />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.2, ease: SIDEBAR_EASE }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {n.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3">
          <button
            onClick={() => navigate("/dashboard/quotes/new")}
            className={cn("btn btn-solid w-full", collapsed && "px-0")}
            title={collapsed ? "New quote" : undefined}
          >
            <Plus size={16} />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.2, ease: SIDEBAR_EASE }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  New quote
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* profile footer */}
        <div className="relative border-t border-line p-3">
          <AnimatePresence>
            {profileOpen && !collapsed && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden border border-line bg-surface shadow-[0_-12px_30px_-16px_rgba(22,24,28,0.3)]"
              >
                <button
                  onClick={() => { setProfileOpen(false); navigate("/dashboard/settings"); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 font-grotesk text-sm text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
                >
                  <SettingsIcon size={15} /> Settings
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 font-grotesk text-sm text-danger transition-colors hover:bg-danger/5"
                >
                  <LogOut size={15} /> {isSandbox ? "Exit sandbox" : "Log out"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className={cn("flex w-full items-center gap-2.5 border border-line bg-paper-dim/50 p-2 transition-colors hover:bg-paper-dim", collapsed && "justify-center border-0 bg-transparent p-1")}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-ink font-grotesk text-[12px] font-semibold text-paper">
              {initials}
            </span>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.2, ease: SIDEBAR_EASE }}
                  className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden"
                >
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate font-grotesk text-[13px] font-medium text-ink">{user?.name}</span>
                    <span className="block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      {isSandbox ? "Sandbox" : "Admin"}
                    </span>
                  </span>
                  <ChevronUp size={15} className={cn("shrink-0 text-ink-faint transition-transform", profileOpen && "rotate-180")} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* ── Mobile sidebar ── */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-ink/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-surface"
            >
              <div className="flex h-16 items-center gap-2 border-b border-line px-4">
                <Mark size={28} /> <Logo />
              </div>
              <nav className="flex-1 space-y-0.5 p-3">
                {NAV.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    onClick={() => setMobileOpen(false)}
                    className={navItem(false)}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute left-0 top-0 h-full w-[3px] bg-glow" />}
                        <n.icon size={18} className={isActive ? "text-ink" : "text-ink-faint"} />
                        <span>{n.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
              <div className="p-3">
                <button onClick={() => { setMobileOpen(false); navigate("/dashboard/quotes/new"); }} className="btn btn-solid w-full">
                  <Plus size={16} /> New quote
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── Main column ── */}
      <div className={cn("flex min-h-screen flex-col transition-all", collapsed ? "lg:pl-[76px]" : "lg:pl-[252px]")}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:px-7">
          <button
            className="p-2 text-ink lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              placeholder="Search quotes, clients…"
              onFocus={() => info("Search", "Connected to seed data — try the Quotes page filters.")}
              className="h-9 w-full border border-ink/15 bg-paper pl-9 pr-3 font-sans text-sm text-ink transition-all placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {isSandbox && (
              <span className="hidden items-center gap-1.5 border border-glow/40 bg-glow/[0.08] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6a2e] sm:inline-flex">
                <Beaker size={12} /> Sandbox · temporary data
              </span>
            )}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 text-ink-soft transition-colors hover:text-ink"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-glow" />
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: SIDEBAR_EASE }}
                    className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden border border-line bg-surface shadow-[0_18px_44px_-20px_rgba(22,24,28,0.4)]"
                  >
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                        Notifications
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                        {notifList.length}
                      </span>
                    </div>

                    {notifList.length === 0 ? (
                      <div className="px-4 py-10 text-center font-sans text-sm text-ink-faint">
                        You're all caught up
                      </div>
                    ) : (
                      <ul className="max-h-80 overflow-y-auto">
                        {notifList.map((n) => {
                          const meta = NOTIF_META[n.template];
                          const Icon = meta.icon;
                          const failed = n.status === "failed";
                          return (
                            <li
                              key={n._id}
                              className="flex items-start gap-3 border-b border-line/70 px-4 py-3 last:border-b-0"
                            >
                              <Icon
                                size={15}
                                className={cn(
                                  "mt-0.5 shrink-0",
                                  failed ? "text-danger" : "text-ink-faint"
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-grotesk text-[13px] font-medium text-ink">
                                  {meta.label}
                                </p>
                                <p className="truncate font-sans text-xs text-ink-soft">{n.to}</p>
                              </div>
                              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                                {timeAgo(n.sentAt ?? n.createdAt)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        navigate("/dashboard/webhooks");
                      }}
                      className="block w-full border-t border-line px-4 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
                    >
                      View all
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {isSandbox && (
          <div className="border-b border-glow/30 bg-glow/[0.07] px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[#8a6a2e] sm:hidden">
            <Beaker size={11} className="mr-1 inline" /> Sandbox · data is temporary
          </div>
        )}

        <main className="flex-1 px-4 py-7 lg:px-7 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
