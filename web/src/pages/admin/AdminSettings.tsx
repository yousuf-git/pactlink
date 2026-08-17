import { useState } from "react";
import {
  Save,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Link2,
  PenTool,
  Lock,
  Mail,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/Shared";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Misc";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { PLAN_MRR } from "@/data/adminSeed";
import type { PlatformPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

// Danger-zone button: outlined in danger, fills danger on hover (sharp, no swipe).
const dangerOutline =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap border border-danger px-4 py-2 font-grotesk text-[13px] font-medium text-danger transition-colors hover:bg-danger hover:text-paper";

// ── Editorial panel header (Bricolage title + optional mono description) ──────
function PanelHead({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-line px-5 py-4">
      <h2 className="font-headline text-lg font-bold tracking-[-0.02em] text-ink">{title}</h2>
      {description && (
        <p className="mt-1 font-sans text-sm leading-relaxed text-ink-soft">{description}</p>
      )}
    </div>
  );
}

// ── Sharp custom switch — ink when on (glow knob accent), ink-faint when off ──
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 border transition-colors",
        checked ? "border-ink bg-ink" : "border-ink/25 bg-paper-dim"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-all",
          checked ? "left-[18px] bg-glow" : "left-[2px] bg-ink-faint"
        )}
      />
    </button>
  );
}

// ── Static plan metadata (price comes from PLAN_MRR) ──────────────────────────
const PLAN_META: Record<PlatformPlan, { label: string; feature: string }> = {
  trial: { label: "Trial", feature: "14 days · 3 quotes · no deposits" },
  starter: { label: "Starter", feature: "Unlimited quotes · 1 seat · Stripe deposits" },
  growth: { label: "Growth", feature: "Everything in Starter · DocuSeal · 3 seats" },
  scale: { label: "Scale", feature: "Priority support · webhooks · 10 seats" },
};
const PLAN_ORDER: PlatformPlan[] = ["trial", "starter", "growth", "scale"];

interface FlagDef {
  key: string;
  label: string;
  description: string;
  defaultOn: boolean;
}
const FLAG_DEFS: FlagDef[] = [
  { key: "docuseal", label: "DocuSeal e-signature", description: "Typed/drawn signing with timestamp + IP.", defaultOn: true },
  { key: "stripe", label: "Stripe deposits", description: "Collect deposit + balance via Stripe.", defaultOn: true },
  { key: "sandbox", label: "Sandbox sessions", description: "Let prospects explore a seeded read-only account.", defaultOn: true },
  { key: "signups", label: "New signups open", description: "Allow new tenants to be provisioned.", defaultOn: true },
  { key: "webhookRetries", label: "Webhook retries", description: "Exponential backoff on failed deliveries.", defaultOn: true },
  { key: "emails", label: "Email notifications", description: "Transactional + lifecycle emails.", defaultOn: false },
];

export default function AdminSettings() {
  const { user } = useAuth();
  const { success, info } = useToast();

  // Plans & pricing — editable price per plan, in dollars (derived from PLAN_MRR minor)
  const [prices, setPrices] = useState<Record<PlatformPlan, string>>(() =>
    PLAN_ORDER.reduce(
      (acc, plan) => ({ ...acc, [plan]: (PLAN_MRR[plan] / 100).toString() }),
      {} as Record<PlatformPlan, string>
    )
  );

  // Feature flags — local toggle state
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    FLAG_DEFS.reduce((acc, f) => ({ ...acc, [f.key]: f.defaultOn }), {} as Record<string, boolean>)
  );

  // Admin profile (read from auth)
  const [name, setName] = useState(user?.name ?? "");
  const email = user?.email ?? "";

  // Danger-zone confirmation
  const [danger, setDanger] = useState<null | { title: string; body: string; confirmLabel: string; onConfirm: () => void }>(null);

  const savePlans = () => success("Plans saved", "New pricing applies to future signups.");
  const saveFlags = () => success("Feature flags saved", "Platform behaviour updated.");
  const saveProfile = () => success("Profile updated");

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Settings"
        subtitle="Plans, feature flags, integrations, and platform controls."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Plans & pricing ──────────────────────────────────────── */}
        <Panel className="lg:col-span-2">
          <PanelHead title="Plans & pricing" description="Monthly recurring price per plan. Edit and save to update the billing source." />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  {["Plan", "Current", "Includes", "Monthly price (USD)"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint last:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLAN_ORDER.map((plan) => (
                  <tr key={plan} className="border-b border-line last:border-0">
                    <td className="px-5 py-4">
                      <span className="font-grotesk text-sm font-medium text-ink">{PLAN_META[plan].label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Money minor={PLAN_MRR[plan]} className="text-sm text-ink-soft" />
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-sans text-sm leading-snug text-ink-soft">{PLAN_META[plan].feature}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono text-sm text-ink-faint">$</span>
                        <input
                          type="number"
                          min={0}
                          value={prices[plan]}
                          onChange={(e) => setPrices((p) => ({ ...p, [plan]: e.target.value }))}
                          className="h-9 w-28 rounded-none border border-ink/20 bg-paper px-3 text-right font-mono text-sm tabular-nums text-ink transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t border-line px-5 py-3">
            <button onClick={savePlans} className="btn btn-solid btn-sm">
              <Save size={15} /> Save plans
            </button>
          </div>
        </Panel>

        {/* ── Feature flags ────────────────────────────────────────── */}
        <Panel>
          <PanelHead title="Feature flags" description="Toggle platform capabilities. Changes are global." />
          <div className="divide-y divide-line">
            {FLAG_DEFS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="font-grotesk text-sm font-medium text-ink">{f.label}</p>
                  <p className="mt-0.5 font-sans text-xs leading-relaxed text-ink-soft">{f.description}</p>
                </div>
                <Switch
                  label={f.label}
                  checked={flags[f.key]}
                  onChange={(v) => setFlags((s) => ({ ...s, [f.key]: v }))}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-line px-5 py-3">
            <button onClick={saveFlags} className="btn btn-solid btn-sm">
              <Save size={15} /> Save flags
            </button>
          </div>
        </Panel>

        {/* ── Webhook & integrations ───────────────────────────────── */}
        <Panel>
          <PanelHead title="Webhook & integrations" description="Connected services and the platform delivery endpoint." />
          <div className="divide-y divide-line">
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <Link2 size={16} className="shrink-0 text-ink-faint" />
                <div>
                  <p className="font-grotesk text-sm font-medium text-ink">Stripe</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">acct_1Q · live mode</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 border border-glow/50 bg-glow/[0.08] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#8a6a2e]">
                <CheckCircle2 size={11} /> Connected
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <PenTool size={16} className="shrink-0 text-ink-faint" />
                <div>
                  <p className="font-grotesk text-sm font-medium text-ink">DocuSeal</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">template api · v2</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 border border-glow/50 bg-glow/[0.08] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#8a6a2e]">
                <CheckCircle2 size={11} /> Connected
              </span>
            </div>

            <div className="px-5 py-3.5">
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Webhook endpoint</p>
              <div className="flex items-center justify-between gap-3">
                <code className="truncate border border-line bg-paper-dim/50 px-2.5 py-1.5 font-mono text-[12px] text-ink-soft">
                  https://api.pactlink.app/v1/webhooks/stripe
                </code>
                <button
                  onClick={() => info("Secret rotated", "A new signing secret has been issued. Update your endpoint config.")}
                  className="btn btn-outline btn-sm shrink-0"
                >
                  <RotateCcw size={14} /> Rotate secret
                </button>
              </div>
            </div>
          </div>
        </Panel>

        {/* ── Admin profile ────────────────────────────────────────── */}
        <Panel>
          <PanelHead title="Admin profile" description="The platform operator account." />
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-none border border-ink/20 bg-paper px-3 font-sans text-sm text-ink transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">Email</span>
              <input
                value={email}
                disabled
                className="h-10 w-full rounded-none border border-ink/20 bg-paper-dim px-3 font-sans text-sm text-ink-soft"
              />
              <span className="mt-1 block font-sans text-xs text-ink-faint">Login identifier — managed by the platform.</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button onClick={saveProfile} className="btn btn-solid btn-sm">
                <Save size={15} /> Save profile
              </button>
              <button
                onClick={() => info("Reset email sent", "Check the admin inbox to set a new password.")}
                className="btn btn-outline btn-sm"
              >
                <KeyRound size={14} /> Change password
              </button>
            </div>
          </div>
        </Panel>

        {/* ── Danger zone ──────────────────────────────────────────── */}
        <Panel className="lg:col-span-2 border-danger/40">
          <div className="border-b border-danger/30 px-5 py-4">
            <h2 className="flex items-center gap-2 font-headline text-lg font-bold tracking-[-0.02em] text-danger">
              <AlertTriangle size={17} /> Danger zone
            </h2>
            <p className="mt-1 font-sans text-sm leading-relaxed text-ink-soft">
              Platform-wide destructive actions. These affect every tenant.
            </p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="flex items-start justify-between gap-4 border border-line p-4">
              <div className="flex items-start gap-3">
                <Lock size={16} className="mt-0.5 shrink-0 text-danger" />
                <div>
                  <p className="font-grotesk text-sm font-medium text-ink">Pause all signups</p>
                  <p className="mt-0.5 font-sans text-xs leading-relaxed text-ink-soft">
                    Block new tenant provisioning platform-wide.
                  </p>
                </div>
              </div>
              <button
                className={dangerOutline}
                onClick={() =>
                  setDanger({
                    title: "Pause all signups?",
                    body: "New tenants will be unable to provision accounts until you re-enable signups. Existing tenants are unaffected.",
                    confirmLabel: "Pause signups",
                    onConfirm: () => info("Signups paused", "New tenant provisioning is now blocked."),
                  })
                }
              >
                Pause
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 border border-line p-4">
              <div className="flex items-start gap-3">
                <Mail size={16} className="mt-0.5 shrink-0 text-danger" />
                <div>
                  <p className="font-grotesk text-sm font-medium text-ink">Purge expired sandboxes</p>
                  <p className="mt-0.5 font-sans text-xs leading-relaxed text-ink-soft">
                    Permanently delete all expired sandbox sessions.
                  </p>
                </div>
              </div>
              <button
                className={dangerOutline}
                onClick={() =>
                  setDanger({
                    title: "Purge expired sandboxes?",
                    body: "All sandbox sessions past their expiry will be permanently deleted. This cannot be undone.",
                    confirmLabel: "Purge sandboxes",
                    onConfirm: () => info("Sandboxes purged", "Expired sandbox sessions were removed."),
                  })
                }
              >
                Purge
              </button>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Danger confirmation modal ── */}
      <Modal
        open={!!danger}
        onClose={() => setDanger(null)}
        title={danger?.title}
        description={danger?.body}
        footer={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setDanger(null)}>
              Cancel
            </button>
            <button
              className="inline-flex select-none items-center justify-center gap-2 whitespace-nowrap border border-danger bg-danger px-4 py-2 font-grotesk text-[13px] font-medium text-paper transition-colors hover:bg-danger/90"
              onClick={() => {
                danger?.onConfirm();
                setDanger(null);
              }}
            >
              {danger?.confirmLabel}
            </button>
          </>
        }
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-danger">
          This action affects the entire platform.
        </p>
      </Modal>
    </>
  );
}
