import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ArrowUpRight, Mail, MapPin, Clock, CheckCircle2, MessageSquare } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/sections/Section";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { useToast } from "@/context/ToastContext";
import { contactSchema, type ContactInput } from "@/lib/schemas";

const SUBJECTS = [
  "Early access request",
  "Question about a feature",
  "Pricing & plans",
  "Webhook / integration question",
  "Partnership or press",
];
const CUSTOM = "Other (specify)";

const ASIDE = [
  {
    icon: Mail,
    label: "Email",
    body: (
      <a
        href="mailto:hello@pactlink.app"
        className="font-grotesk text-sm text-paper underline decoration-paper/30 underline-offset-4 transition-colors hover:decoration-glow"
      >
        hello@pactlink.app
      </a>
    ),
  },
  {
    icon: MapPin,
    label: "Where we are",
    body: <p className="font-sans text-sm leading-relaxed text-paper/60">Remote-first · Pacific Northwest, USA</p>,
  },
  {
    icon: Clock,
    label: "Response time",
    body: <p className="font-sans text-sm leading-relaxed text-paper/60">Within one business day, Mon–Fri.</p>,
  },
  {
    icon: MessageSquare,
    label: "Before you write",
    body: (
      <p className="font-sans text-sm leading-relaxed text-paper/60">
        The sandbox answers most “does it do X?” questions — it's the full product, loaded with example data.
      </p>
    ),
  },
];

export default function Contact() {
  const { success } = useToast();
  const [sent, setSent] = useState(false);
  const [customSubject, setCustomSubject] = useState(false);
  const [subjectValue, setSubjectValue] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema), defaultValues: { subject: "" } });

  const onSubmit = async (data: ContactInput) => {
    await new Promise((r) => setTimeout(r, 600));
    // eslint-disable-next-line no-console
    console.info("Contact message:", data);
    setSent(true);
    success("Message sent", "We typically reply within one business day.");
  };

  const resetForm = () => {
    reset();
    setCustomSubject(false);
    setSubjectValue("");
    setSent(false);
  };

  const onSubjectChange = (value: string) => {
    setSubjectValue(value);
    if (value === CUSTOM) {
      setCustomSubject(true);
      setValue("subject", "", { shouldValidate: false });
    } else {
      setCustomSubject(false);
      setValue("subject", value, { shouldValidate: true });
    }
  };

  const fieldLabel = "mb-2 block font-grotesk text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft";
  const fieldBase =
    "w-full rounded-none border border-ink/20 bg-paper px-3.5 py-3 font-sans text-sm text-ink transition-all placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink aria-[invalid=true]:border-danger";
  const errText = "mt-1.5 font-mono text-[11px] tracking-[0.02em] text-danger";

  return (
    <section className="container-site py-20 lg:py-28">
      <SectionHeading
        eyebrow="Contact"
        title="Tell us about your quoting workflow"
        subtitle="Questions about early access, a specific edge case, or how the webhook flow handles your setup? We read every message."
      />

      <div className="mt-14 grid gap-px border border-line bg-line lg:mt-16 lg:grid-cols-[1.35fr_1fr]">
        {/* ── form panel ── */}
        <Reveal className="bg-paper">
          <div
            className="relative flex h-full flex-col p-7 sm:p-9"
            style={{ boxShadow: "0 30px 60px -28px rgba(22,24,28,0.16)" }}
          >
            {sent ? (
              <>
                <button
                  type="button"
                  onClick={resetForm}
                  className="group absolute right-6 top-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink"
                >
                  Send another
                  <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
                <div className="flex flex-1 flex-col items-start justify-center py-12">
                  <span className="flex h-12 w-12 items-center justify-center bg-ink text-paper">
                    <CheckCircle2 size={22} />
                  </span>
                  <h3 className="mt-6 font-headline text-[1.9rem] font-bold leading-tight tracking-[-0.02em] text-ink">
                    Message sent<span className="text-glow">.</span>
                  </h3>
                  <p className="mt-3 max-w-md font-sans text-[15px] leading-relaxed text-ink-soft">
                    Thanks for reaching out — we read every message and typically reply
                    within one business day. In the meantime, the sandbox has the full
                    product loaded with example data.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                  Send a message
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="ct-name" className={fieldLabel}>
                    Name
                  </label>
                  <input
                    id="ct-name"
                    placeholder="Mara Voss"
                    aria-invalid={!!errors.name}
                    className={fieldBase}
                    {...register("name")}
                  />
                  {errors.name?.message && <p className={errText}>{errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="ct-email" className={fieldLabel}>
                    Email
                  </label>
                  <input
                    id="ct-email"
                    type="email"
                    placeholder="you@studio.com"
                    aria-invalid={!!errors.email}
                    className={fieldBase}
                    {...register("email")}
                  />
                  {errors.email?.message && <p className={errText}>{errors.email.message}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="ct-subject" className={fieldLabel}>
                  Subject
                </label>
                <SelectMenu
                  id="ct-subject"
                  value={subjectValue}
                  onChange={onSubjectChange}
                  options={[...SUBJECTS, CUSTOM]}
                  placeholder="Choose a subject…"
                  invalid={!!errors.subject}
                />
                {customSubject && (
                  <input
                    autoFocus
                    placeholder="Type your subject"
                    aria-invalid={!!errors.subject}
                    className={`${fieldBase} mt-3`}
                    {...register("subject")}
                  />
                )}
                {errors.subject?.message && <p className={errText}>{errors.subject.message}</p>}
              </div>

              <div>
                <label htmlFor="ct-message" className={fieldLabel}>
                  Message
                </label>
                <textarea
                  id="ct-message"
                  rows={5}
                  placeholder="What are you trying to do?"
                  aria-invalid={!!errors.message}
                  className={`${fieldBase} resize-y`}
                  {...register("message")}
                />
                {errors.message?.message && <p className={errText}>{errors.message.message}</p>}
              </div>

                  <button type="submit" disabled={isSubmitting} className="group btn btn-outline">
                    {isSubmitting ? "Sending…" : "Send message"}
                    <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </form>
              </>
            )}
          </div>
        </Reveal>

        {/* ── dark ink aside ── */}
        <Reveal delay={0.1} className="bg-ink">
          <div className="relative isolate h-full overflow-hidden p-7 sm:p-9">
            <div className="pointer-events-none absolute inset-0 -z-10 ink-panel-grid opacity-60" />
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper/45">
              Ways to reach us
            </p>

            <div className="mt-7 space-y-7">
              {ASIDE.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={i === 0 ? "" : "border-t border-paper/12 pt-7"}
                  >
                    <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/45">
                      <Icon size={14} className="text-glow" />
                      {item.label}
                    </span>
                    <div className="mt-2.5">{item.body}</div>
                  </div>
                );
              })}
            </div>

          </div>
        </Reveal>
      </div>
    </section>
  );
}
