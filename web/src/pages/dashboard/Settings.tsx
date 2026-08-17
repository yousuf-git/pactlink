import { useState } from "react";
import { Palette, User, CreditCard, Lock, Beaker } from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/Shared";
import { Input, Select } from "@/components/ui/Input";
import { Mark } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const PRESET_COLORS = ["#1B4965", "#2E9E6B", "#5FA8D3", "#F4A259", "#7B4DBF", "#D14545"];

// Editorial panel header — Bricolage title + optional mono description, hairline rule.
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

export default function Settings() {
  const { user, isSandbox } = useAuth();
  const { success, info } = useToast();

  const [businessName, setBusinessName] = useState(user?.brand.businessName ?? "");
  const [logoUrl, setLogoUrl] = useState(user?.brand.logoUrl ?? "");
  const [color, setColor] = useState(user?.brand.primaryColor ?? "#1B4965");
  const [name, setName] = useState(user?.name ?? "");
  const [email] = useState(user?.email ?? "");
  const [depositType, setDepositType] = useState(user?.defaultDepositType ?? "percent");
  const [depositValue, setDepositValue] = useState(user?.defaultDepositValue ?? 30);

  const readOnly = isSandbox;

  const saveBrand = () => {
    if (readOnly) {
      info("Sandbox is read-only", "Settings can't be saved in a sandbox session.");
      return;
    }
    success("Branding saved", "New quotes and PDFs will use these.");
  };
  const saveProfile = () => {
    if (readOnly) {
      info("Sandbox is read-only", "Settings can't be saved in a sandbox session.");
      return;
    }
    success("Profile updated");
  };
  const saveDefaults = () => {
    if (readOnly) {
      info("Sandbox is read-only", "Settings can't be saved in a sandbox session.");
      return;
    }
    success("Defaults saved", "Applied to new quotes.");
  };

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        subtitle="Branding, profile, and quote defaults."
      />

      {readOnly && (
        <div className="mb-6 flex items-center gap-2.5 border border-glow/50 bg-glow/[0.08] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8a6a2e]">
          <Beaker size={15} className="shrink-0" />
          Sandbox mode — settings are read-only. Changes won't be saved.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Branding ─────────────────────────────────────────────── */}
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Branding"
            description="Used on the branded PDF and the client approval page."
          />
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_18rem]">
            <div className="space-y-4">
              <Input
                label="Business name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={readOnly}
              />
              <Input
                label="Logo URL (optional)"
                placeholder="https://…/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={readOnly}
              />
              <div>
                <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                  Primary color
                </span>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => !readOnly && setColor(c)}
                      disabled={readOnly}
                      className={`h-8 w-8 rounded-none border transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60 ${
                        color === c ? "ring-1 ring-ink ring-offset-1 ring-offset-surface" : "border-line"
                      }`}
                      style={{ background: c }}
                      aria-label={`Use ${c}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={readOnly}
                    className="h-8 w-12 cursor-pointer rounded-none border border-ink/20 bg-paper disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                    {color}
                  </span>
                </div>
              </div>
              <button
                onClick={saveBrand}
                disabled={readOnly}
                className="btn btn-solid btn-sm"
              >
                <Palette size={15} /> Save branding
              </button>
            </div>

            {/* Live brand preview — faithful client approval header */}
            <div className="w-full md:w-72">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                Live preview
              </p>
              <div className="overflow-hidden border border-line bg-surface">
                <div
                  className="flex items-center gap-3 px-4 py-3.5 text-white"
                  style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-9 w-9 rounded-none object-cover" />
                  ) : (
                    <Mark size={32} tone="paper" />
                  )}
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-80">
                      Quote from
                    </p>
                    <p className="truncate font-headline text-sm font-bold tracking-[-0.01em]">
                      {businessName || "Your business"}
                    </p>
                  </div>
                </div>
                <div className="border-t border-line px-4 py-3 font-sans text-xs leading-relaxed text-ink-soft">
                  This is how the client's approval header looks.
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* ── Profile ──────────────────────────────────────────────── */}
        <Panel>
          <PanelHead title="Profile" />
          <div className="space-y-4 p-5">
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly}
            />
            <Input
              label="Email"
              value={email}
              disabled
              hint="Login identifier — contact us to change."
            />
            <button onClick={saveProfile} disabled={readOnly} className="btn btn-solid btn-sm">
              <User size={15} /> Save profile
            </button>
          </div>
        </Panel>

        {/* ── Quote defaults ───────────────────────────────────────── */}
        <Panel>
          <PanelHead title="Quote defaults" description="Pre-fills new quotes." />
          <div className="space-y-4 p-5">
            <Select
              label="Default deposit type"
              value={depositType}
              onChange={(e) => setDepositType(e.target.value as "fixed" | "percent")}
              disabled={readOnly}
            >
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </Select>
            <Input
              label={depositType === "percent" ? "Default percent" : "Default amount (in cents)"}
              type="number"
              value={depositValue}
              onChange={(e) => setDepositValue(Number(e.target.value))}
              disabled={readOnly}
            />
            <button onClick={saveDefaults} disabled={readOnly} className="btn btn-solid btn-sm">
              <CreditCard size={15} /> Save defaults
            </button>
          </div>
        </Panel>

        {/* ── Security ─────────────────────────────────────────────── */}
        <Panel className="lg:col-span-2">
          <PanelHead title="Security" />
          <div className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <Lock size={18} className="mt-0.5 shrink-0 text-ink-faint" />
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                  Password
                </p>
                <p className="mt-1 font-sans text-sm leading-relaxed text-ink-soft">
                  {isSandbox
                    ? "Password changes are disabled in sandbox sessions."
                    : "Update the password for your login-only account."}
                </p>
              </div>
            </div>
            <button
              className="btn btn-outline btn-sm"
              disabled={isSandbox}
              onClick={() => success("Reset email sent")}
            >
              Change password
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
