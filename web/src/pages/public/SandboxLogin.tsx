import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  Beaker,
  RefreshCw,
  Database,
  Wand2,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { sandboxSchema, type SandboxInput } from "@/lib/schemas";

const EASE = [0.16, 1, 0.3, 1] as const;

const POINTS = [
  {
    icon: Beaker,
    title: "What is the sandbox?",
    body: "A risk-free preview of the full PactLink dashboard. Build quotes, send links, walk the client approval flow — without an account.",
  },
  {
    icon: Database,
    title: "How the data works",
    body: "You start with pre-loaded example quotes, clients, payments and webhook events that show the whole funnel. Everything you create or edit lives only in this tab.",
  },
  {
    icon: RefreshCw,
    title: "What resets",
    body: "Close the tab or let the 2-hour session expire and all changes are discarded. The original seed data is never touched.",
  },
  {
    icon: Wand2,
    title: "What you can do",
    body: "Full access: browse records, build and send quotes, approve and pay a deposit as the client, view charts and the event log. Everything works as it would for a real user.",
  },
];

export default function SandboxLogin() {
  const { startSandbox } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SandboxInput>({
    resolver: zodResolver(sandboxSchema),
    defaultValues: { name: "", email: "", role: "Admin" },
  });

  const onSubmit = async (data: SandboxInput) => {
    await new Promise((r) => setTimeout(r, 400));
    startSandbox(data);
    success("Sandbox ready", "Loaded with Northwind Studio's example data.");
    navigate("/dashboard");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ════════ LEFT — dark ink editorial info panel ════════ */}
      <div className="relative isolate hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
        <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 bottom-0 -z-0 h-72 w-72 rounded-full blur-[140px]"
          style={{ backgroundColor: "rgba(201,154,65,0.14)" }}
        />

        <div className="relative">
          <Link
            to="/"
            aria-label="PactLink home"
            className="inline-flex items-center transition-opacity hover:opacity-70"
          >
            <Logo tone="paper" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative max-w-lg"
        >
          <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
            Sandbox mode
          </p>
          <h1 className="mt-5 font-headline text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-paper">
            Explore the whole product. Nothing to lose.
          </h1>
          <p className="mt-4 max-w-md font-sans text-[15px] leading-relaxed text-paper/65">
            We'll personalize the session with your name. No account is created,
            no data is written to a server.
          </p>

          <div className="mt-9 space-y-5">
            {POINTS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.08, ease: EASE }}
                className="flex items-start gap-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-paper/20 text-paper/70">
                  <p.icon size={16} />
                </span>
                <div>
                  <p className="font-grotesk text-sm font-medium text-paper">{p.title}</p>
                  <p className="mt-1 font-sans text-[13px] leading-relaxed text-paper/55">{p.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="relative font-mono text-[11px] uppercase tracking-[0.14em] text-paper/45">
          Ready for a real account?{" "}
          <Link
            to="/pricing"
            className="border-b border-paper/40 pb-0.5 text-paper/70 transition-colors hover:border-glow hover:text-glow"
          >
            Request early access
          </Link>
        </p>
      </div>

      {/* ════════ RIGHT — transparent canvas + sharp paper form card ════════ */}
      <div className="relative flex items-center justify-center bg-paper bp-grid p-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: EASE }}
          className="relative w-full max-w-md"
        >
          {/* organic offset shadow plate */}
          <div
            className="absolute inset-0 translate-x-2.5 translate-y-2.5 border border-line"
            aria-hidden
          />
          <div
            className="relative border border-line bg-[#FBFAF7] p-8 sm:p-10"
            style={{ boxShadow: "0 30px 60px -28px rgba(22,24,28,0.16)" }}
          >
            {/* mobile wordmark */}
            <div className="mb-8 lg:hidden">
              <Link
                to="/"
                aria-label="PactLink home"
                className="inline-flex items-center transition-opacity hover:opacity-70"
              >
                <Logo />
              </Link>
            </div>

            <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
              Start exploring
            </p>
            <h2 className="mt-4 font-headline text-3xl font-bold leading-[1.02] tracking-[-0.025em] text-ink">
              Launch your sandbox
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">
              Just enough to personalize your session.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
              {/* Full name */}
              <label className="block">
                <span className="mb-2 block font-grotesk text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
                  Full name
                </span>
                <input
                  type="text"
                  placeholder="Mara Voss"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                  className="h-11 w-full rounded-none border border-ink/20 bg-paper px-3 font-sans text-sm text-ink placeholder:text-ink-faint transition-all focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink aria-[invalid=true]:border-danger"
                />
                {errors.name?.message && (
                  <span className="mt-1.5 block font-mono text-[11px] tracking-[0.04em] text-danger">
                    {errors.name.message}
                  </span>
                )}
              </label>

              {/* Email */}
              <label className="block">
                <span className="mb-2 block font-grotesk text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
                  Email
                </span>
                <input
                  type="email"
                  placeholder="you@studio.com"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                  className="h-11 w-full rounded-none border border-ink/20 bg-paper px-3 font-sans text-sm text-ink placeholder:text-ink-faint transition-all focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink aria-[invalid=true]:border-danger"
                />
                {errors.email?.message && (
                  <span className="mt-1.5 block font-mono text-[11px] tracking-[0.04em] text-danger">
                    {errors.email.message}
                  </span>
                )}
              </label>

              {/* Role */}
              <label className="block">
                <span className="mb-2 block font-grotesk text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
                  Role (optional)
                </span>
                <select
                  {...register("role")}
                  className="h-11 w-full appearance-none rounded-none border border-ink/20 bg-paper px-3 pr-9 font-sans text-sm text-ink transition-all focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23565A61' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.7rem center",
                  }}
                >
                  <option>Admin</option>
                  <option>Owner</option>
                  <option>Operations</option>
                  <option>Finance</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group btn btn-solid w-full"
              >
                {isSubmitting ? "Launching…" : "Launch sandbox"}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              <Clock size={12} /> Session lasts 2 hours · data is temporary
            </div>

            <div className="mt-7 border-t border-line pt-5 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
              Have credentials?{" "}
              <Link
                to="/login"
                className="border-b border-ink/40 pb-0.5 text-ink transition-colors hover:border-glow hover:text-glow"
              >
                Log in instead
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
