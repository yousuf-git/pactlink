import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { loginSchema, type LoginInput } from "@/lib/schemas";

const EASE = [0.16, 1, 0.3, 1] as const;

// Editorial monochrome staff login. Dark ink panel (brand, blueprint grid)
// pairs with a paper canvas + sharp paper auth card. Sharp corners, mono
// uppercase metadata, single amber glow accent. Behavior is unchanged.
export default function StaffLogin() {
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    setAuthError(null);
    try {
      const u = await login(data.email, data.password);
      const admin = u.role === "admin";
      success("Welcome back", admin ? "Loading the platform console…" : "Loading your dashboard…");
      navigate(admin ? "/admin" : "/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed.";
      setAuthError(msg);
      error("Couldn't sign in", msg);
    }
  };

  const fieldClass =
    "h-11 w-full rounded-none border border-ink/20 bg-paper px-3.5 font-sans text-sm text-ink placeholder:text-ink-faint transition-all focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink";
  const labelClass =
    "mb-2 block font-grotesk text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ════════ Brand panel — dark ink slab ════════ */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
        <div className="ink-panel-grid pointer-events-none absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full blur-[140px]"
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
          className="relative max-w-md"
        >
          <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
            Staff console
          </p>
          <h1 className="mt-5 font-headline text-4xl font-bold leading-[1.02] tracking-[-0.03em] text-paper">
            Your pipeline, your money, all in one panel.
          </h1>
          <p className="mt-4 max-w-md font-sans text-[15px] leading-relaxed text-paper/65">
            Quotes sent, view-to-approve rate, deposit conversion, and the
            webhook event log that proves every transition.
          </p>
          <p className="mt-8 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/55">
            <ShieldCheck size={15} className="text-glow" />
            Stateless JWT · login-only, no public signup
          </p>
        </motion.div>

        <p className="relative font-mono text-[11px] uppercase tracking-[0.12em] text-paper/40">
          draft → sent → viewed → approved → <span className="text-glow">deposit_paid</span>
        </p>
      </div>

      {/* ════════ Form — paper canvas + sharp card ════════ */}
      <div className="bp-grid relative flex items-center justify-center bg-paper p-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative w-full max-w-sm"
        >
          {/* organic shadow card */}
          <div
            className="relative border border-line bg-paper p-8"
            style={{ boxShadow: "0 30px 60px -28px rgba(22,24,28,0.16)" }}
          >
            <Link
              to="/"
              aria-label="PactLink home"
              className="mb-7 inline-flex items-center transition-opacity hover:opacity-70 lg:hidden"
            >
              <Logo />
            </Link>

            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
              Sign in
            </p>
            <h2 className="mt-2 font-headline text-3xl font-bold leading-[1.0] tracking-[-0.03em] text-ink">
              Log in
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">
              Welcome back. Enter your credentials to continue.
            </p>

            {authError && (
              <div className="mt-5 border-l-2 border-danger bg-paper-dim px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.1em] text-danger">
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <div>
                <label htmlFor="staff-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="staff-email"
                  type="email"
                  placeholder="you@business.com"
                  autoComplete="email"
                  className={fieldClass}
                  {...register("email")}
                />
                {errors.email?.message && (
                  <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-danger">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="staff-password" className={labelClass}>
                  Password
                </label>
                <input
                  id="staff-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={fieldClass}
                  {...register("password")}
                />
                {errors.password?.message && (
                  <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-danger">
                    {errors.password.message}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => error("Password reset", "Reset emails are available once your account is provisioned.")}
                  className="mt-2 border-b border-ink-faint pb-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft transition-colors hover:border-glow hover:text-ink"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group btn btn-solid w-full"
              >
                {isSubmitting ? "Signing in…" : "Log in"}
                {!isSubmitting && (
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                )}
              </button>
            </form>
          </div>

          {/* sandbox redirect — below card */}
          <div className="mt-6 flex items-center justify-center gap-3 text-center">
            <Lock size={13} className="text-ink-faint" />
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
              Login-only ·{" "}
              <Link
                to="/sandbox-login"
                className="border-b border-ink pb-0.5 text-ink transition-colors hover:border-glow hover:text-ink-soft"
              >
                Try the dashboard first
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
