import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Loader2, Check } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { emailIssue } from "@/lib/validation";
import { cn } from "@/lib/utils";

const COLS = [
  {
    title: "Product",
    links: [
      { to: "/how-it-works", label: "How it works" },
      { to: "/pricing", label: "Early access" },
      { to: "/blog", label: "Blog" },
      { to: "/sandbox-login", label: "Try the sandbox" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
      { to: "/privacy", label: "Privacy" },
      { to: "/terms", label: "Terms" },
      // { to: "/login", label: "Log in" },
    ],
  },
];

// Asymmetric editorial footer — dark ink slab, faint blueprint grid, an
// oversized PactLink wordmark, mono metadata. Mirrors the Hero vibe.
export function Footer() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const issue = emailIssue(email);
    if (issue) {
      setErr(issue);
      return;
    }
    setErr(null);
    setStatus("loading");
    await new Promise((r) => setTimeout(r, 1100));
    setStatus("done");
  };

  return (
    <footer className="relative isolate overflow-hidden bg-ink text-paper">
      <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-0 -z-0 h-72 w-72 rounded-full blur-[140px]"
        style={{ backgroundColor: "rgba(201,154,65,0.14)" }}
      />

      <div className="container-site relative">
        {/* ── asymmetric top: tagline/newsletter wide-left, links right ── */}
        <div className="grid gap-x-8 gap-y-12 pt-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
              Quote-to-Deposit System
            </p>
            <p className="mt-5 max-w-sm font-headline text-2xl font-medium leading-[1.15] tracking-[-0.01em] text-paper">
              Turn an estimate into a signed agreement and a paid deposit — through
              one shareable link.
            </p>

            <div className="mt-7 max-w-sm">
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
                Get launch updates
              </label>
              {status === "done" ? (
                <div className="flex items-start gap-2.5 border border-glow/40 bg-glow/[0.07] px-3.5 py-3">
                  <Check size={16} className="mt-0.5 shrink-0 text-glow" />
                  <p className="font-sans text-[13px] leading-relaxed text-paper/85">
                    You're on the list. We'll send a single email the day early access
                    opens — no newsletters, no noise.
                  </p>
                </div>
              ) : (
                <form onSubmit={subscribe} noValidate>
                  <div
                    className={cn(
                      "flex border transition-colors",
                      err ? "border-[#E0857E]" : "border-paper/30 focus-within:border-glow"
                    )}
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (err) setErr(null);
                      }}
                      disabled={status === "loading"}
                      placeholder="you@studio.com"
                      className="h-11 flex-1 bg-transparent px-3.5 font-sans text-sm text-paper placeholder:text-paper/35 focus:outline-none disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="group flex h-11 w-11 items-center justify-center text-paper/70 transition-colors hover:text-glow disabled:cursor-not-allowed"
                      aria-label="Subscribe"
                    >
                      {status === "loading" ? (
                        <Loader2 size={16} className="animate-spin text-glow" />
                      ) : (
                        <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                      )}
                    </button>
                  </div>
                  {err && (
                    <p className="mt-2 font-mono text-[11px] tracking-[0.02em]" style={{ color: "#E0857E" }}>
                      {err}
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* social */}
            {/* <div className="mt-7 flex gap-2">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="https://example.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center border border-paper/20 text-paper/60 transition-colors hover:border-glow hover:text-paper"
                  aria-label="Social link"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div> */}
          </div>

          <div className="hidden md:col-span-1 md:block" />

          {COLS.map((col) => (
            <div key={col.title} className="md:col-span-3">
              <h4 className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/40">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link
                      to={l.to}
                      className="group inline-flex items-center gap-1.5 font-grotesk text-sm text-paper/75 transition-colors hover:text-paper"
                    >
                      {l.label}
                      <ArrowUpRight
                        size={13}
                        className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-60"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── oversized wordmark ── */}
        <div className="mt-16 select-none overflow-hidden">
          <h2>
            <Logo
              tone="paper"
              className="text-[clamp(4.5rem,19vw,17rem)] leading-[0.82] tracking-[-0.04em]"
            />
          </h2>
        </div>

        {/* ── bottom bar ── */}
        <div className="flex flex-col gap-4 border-t border-paper/15 py-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-paper/45">
            © {new Date().getFullYear()} PactLink · Built for service businesses
          </p>
        </div>
      </div>
    </footer>
  );
}
