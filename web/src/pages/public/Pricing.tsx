import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/sections/Section";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { useToast } from "@/context/ToastContext";
import { earlyAccessSchema, type EarlyAccessInput } from "@/lib/schemas";

const BUSINESS_TYPES = [
  "Contractor / trades",
  "Agency / studio",
  "Photographer / video",
  "Event / AV",
  "Consultant",
  "Other service business",
];
const QUOTE_VOLUMES = ["1–10", "11–30", "31–75", "75+"];

const INCLUDED = [
  "Toggleable quote builder with optional & tiered items",
  "Branded PDF + hosted approval link",
  "Typed/drawn e-signature with timestamp + IP",
  "Stripe deposit (fixed or %) + automatic balance invoice",
  "Webhook-first state machine & idempotent event log",
  "Pipeline, funnel analytics & time-to-approval",
];

export default function Pricing() {
  const navigate = useNavigate();
  const { success } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EarlyAccessInput>({
    resolver: zodResolver(earlyAccessSchema),
    defaultValues: { businessType: "", monthlyQuotes: "", message: "" },
  });

  const onSubmit = async (data: EarlyAccessInput) => {
    await new Promise((r) => setTimeout(r, 700));
    // eslint-disable-next-line no-console
    console.info("Early-access request:", data);
    setSubmitted(true);
    success("Request received", "We'll reach out within two business days.");
  };

  return (
    <>
      {/* ════════ HERO — invitation framing ════════ */}
      <section className="container-site pb-12 pt-20 lg:pb-16 lg:pt-28">
        <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:items-end lg:gap-x-8">
          <Reveal className="lg:col-span-8">
            <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
              Early access · By invitation
            </p>
            <h1
              className="mt-6 font-headline font-bold leading-[0.9] tracking-[-0.035em] text-ink"
              style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)" }}
            >
              No self-serve plans.
              <br />
              By invitation<span className="text-glow">.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-4">
            <p className="max-w-md font-sans text-base leading-relaxed text-ink-soft">
              PactLink is onboarding service businesses one at a time while the
              payments core stays small and proven. Tell us about your work and
              we'll get you in — or explore everything right now in the sandbox.
            </p>
            <button
              onClick={() => navigate("/sandbox-login")}
              className="group mt-6 inline-flex items-center gap-2 border-b border-ink pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:border-glow hover:text-ink-soft"
            >
              Open the sandbox
              <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </Reveal>
        </div>
      </section>

      {/* ════════ INCLUDED + REQUEST ════════ */}
      <section className="bg-paper-dim">
        <div className="container-site py-16 lg:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="One plan · The whole product"
              title="What early-access partners get"
              subtitle="The full product — not a trimmed trial. Pricing is set together during onboarding based on your volume."
            />
          </Reveal>

          <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map((feature, i) => (
              <Reveal key={feature} delay={0.04 * i}>
                <div className="flex h-full items-start gap-3.5 bg-paper p-6">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-ink text-ink">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <p className="font-sans text-[15px] leading-snug text-ink">{feature}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              draft → sent → viewed → approved → <span className="text-glow">deposit_paid</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ════════ REQUEST FORM — dark ink panel ════════ */}
      <section className="container-site py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-12">
          <Reveal className="lg:col-span-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
              Request access
            </p>
            <h2 className="mt-5 font-headline text-[2rem] font-bold leading-[1.04] tracking-[-0.025em] text-ink sm:text-[2.4rem]">
              Tell us about
              <br />
              your work.
            </h2>
            <p className="mt-5 max-w-sm font-sans text-base leading-relaxed text-ink-soft">
              A few details so we can tailor the onboarding. We review every
              request personally — no card required, no sales call to dodge.
            </p>
            <ul className="mt-7 space-y-3">
              {["No card required", "We never share your details", "Reply within two business days"].map((line) => (
                <li key={line} className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  <span className="inline-block h-1 w-1 rounded-full bg-glow" />
                  {line}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-8">
            <div
              className="relative overflow-hidden bg-ink p-7 text-paper sm:p-10"
              style={{ boxShadow: "0 34px 70px -28px rgba(22,24,28,0.55)" }}
            >
              <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />

              {submitted ? (
                <div className="relative flex flex-col items-center justify-center py-16 text-center">
                  <span className="mb-6 flex h-14 w-14 items-center justify-center" style={{ backgroundColor: "#C99A4B", color: "#16181C" }}>
                    <Check size={28} strokeWidth={2.5} />
                  </span>
                  <h2 className="font-headline text-3xl font-bold tracking-[-0.02em] text-paper">
                    You're on the list
                  </h2>
                  <p className="mt-3 max-w-sm font-sans text-sm leading-relaxed text-paper/70">
                    Thanks — we review every request personally and will reach out
                    within two business days. In the meantime, the sandbox is open.
                  </p>
                  <button
                    onClick={() => navigate("/sandbox-login")}
                    className="group btn btn-on-ink mt-8"
                  >
                    Explore the sandbox
                    <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-7">
                  <div className="grid gap-7 sm:grid-cols-2">
                    <Field label="Your name" error={errors.name?.message}>
                      <input
                        placeholder="Mara Voss"
                        aria-invalid={!!errors.name}
                        className={darkField}
                        {...register("name")}
                      />
                    </Field>
                    <Field label="Work email" error={errors.email?.message}>
                      <input
                        type="email"
                        placeholder="you@studio.com"
                        aria-invalid={!!errors.email}
                        className={darkField}
                        {...register("email")}
                      />
                    </Field>
                  </div>

                  <Field label="Company" error={errors.company?.message}>
                    <input
                      placeholder="Northwind Studio"
                      aria-invalid={!!errors.company}
                      className={darkField}
                      {...register("company")}
                    />
                  </Field>

                  <input type="hidden" {...register("businessType")} />
                  <input type="hidden" {...register("monthlyQuotes")} />
                  <div className="grid gap-7 sm:grid-cols-2">
                    <Field label="What do you do?" error={errors.businessType?.message}>
                      <SelectMenu
                        tone="dark"
                        placeholder="Select…"
                        options={BUSINESS_TYPES}
                        value={watch("businessType")}
                        invalid={!!errors.businessType}
                        onChange={(v) => setValue("businessType", v, { shouldValidate: true })}
                      />
                    </Field>
                    <Field label="Quotes per month" error={errors.monthlyQuotes?.message}>
                      <SelectMenu
                        tone="dark"
                        placeholder="Select…"
                        options={QUOTE_VOLUMES}
                        value={watch("monthlyQuotes")}
                        invalid={!!errors.monthlyQuotes}
                        onChange={(v) => setValue("monthlyQuotes", v, { shouldValidate: true })}
                      />
                    </Field>
                  </div>

                  <Field label="Anything we should know? (optional)" error={errors.message?.message}>
                    <textarea
                      placeholder="Current tools, biggest headache, ideal go-live…"
                      rows={3}
                      className={`${darkField} h-auto min-h-[88px] resize-y py-2`}
                      {...register("message")}
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group btn btn-on-ink w-full sm:w-auto"
                  >
                    {isSubmitting ? "Sending…" : "Request access"}
                    <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                  </button>

                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/45">
                    No card required · We never share your details
                  </p>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

// ── dark-panel field primitives (mono label + outlined field on ink) ──
const darkField =
  "w-full border border-paper/30 bg-transparent px-3.5 py-3 font-sans text-sm text-paper placeholder:text-paper/35 transition-all focus:border-glow focus:outline-none focus:ring-1 focus:ring-glow/40 aria-[invalid=true]:border-[#E0857E]";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper/50">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block font-mono text-[11px] tracking-[0.02em]" style={{ color: "#E0857E" }}>
          {error}
        </span>
      )}
    </label>
  );
}
