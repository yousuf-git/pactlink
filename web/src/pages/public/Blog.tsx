import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Loader2, Check } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/sections/Section";
import { BlogCover } from "@/components/sections/BlogCover";
import { blogPosts, blogCategories } from "@/data/blog";
import { formatDate, cn } from "@/lib/utils";
import { emailIssue } from "@/lib/validation";

export default function Blog() {
  const [cat, setCat] = useState("All");
  const [featured, ...rest] = blogPosts;

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

  const visible = useMemo(
    () => (cat === "All" ? rest : rest.filter((p) => p.category === cat)),
    [cat, rest]
  );

  return (
    <>
      {/* ════════ Masthead + featured ════════ */}
      <section className="container-site py-20 lg:py-24">
        <Reveal>
          <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
            The PactLink blog
          </p>
          <h1
            className="mt-5 max-w-4xl font-headline font-bold leading-[0.98] tracking-[-0.03em] text-ink"
            style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)" }}
          >
            Notes on payments, signatures, and closing the gap<span className="text-glow">.</span>
          </h1>
        </Reveal>

        {/* Featured — sharp split card, ink panel left / paper meta right */}
        <Reveal delay={0.1}>
          <Link
            to={`/blog/${featured.slug}`}
            className="group mt-12 block border border-line bg-paper transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1"
            style={{ boxShadow: "0 30px 60px -28px rgba(22,24,28,0.16)" }}
          >
            <div className="grid md:grid-cols-2">
              {/* ink panel */}
              <div className="relative isolate overflow-hidden bg-ink p-8 text-paper sm:p-10">
                <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
                <featured.coverIcon
                  aria-hidden
                  className="pointer-events-none absolute -bottom-8 -right-6 text-paper/[0.06]"
                  size={190}
                  strokeWidth={1}
                />
                <div className="relative flex h-full flex-col">
                  <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55">
                    <span>Featured</span>
                    <span className="h-px w-6 bg-paper/25" />
                    <span>{featured.category}</span>
                  </p>
                  <h2 className="mt-6 font-headline text-2xl font-bold leading-[1.08] tracking-[-0.02em] sm:text-[2rem]">
                    {featured.title}
                  </h2>
                  <p className="mt-4 max-w-md font-sans text-[15px] leading-relaxed text-paper/70">
                    {featured.excerpt}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-8 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-glow">
                    <span className="border-b border-glow/50 pb-0.5 transition-colors group-hover:border-glow">
                      Read the post
                    </span>
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </div>
              </div>

              {/* meta / lede */}
              <div className="flex flex-col justify-center gap-5 p-8 sm:p-10">
                <p className="font-sans text-base leading-relaxed text-ink-soft">
                  {featured.body[0]}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  <span className="text-ink-soft">{featured.author}</span>
                  <span aria-hidden>·</span>
                  <span>{formatDate(featured.date)}</span>
                  <span aria-hidden>·</span>
                  <span>{featured.readMins} min read</span>
                </div>
              </div>
            </div>
          </Link>
        </Reveal>

        {/* ════════ Category filter — mono tab rail ════════ */}
        <div className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-3">
          {blogCategories.map((c) => {
            const active = cat === c;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                aria-pressed={active}
                className={cn(
                  "relative -mb-3 inline-flex items-center gap-2 border-b-2 pb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors",
                  active
                    ? "border-glow text-ink"
                    : "border-transparent text-ink-faint hover:text-ink-soft"
                )}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-glow" />}
                {c}
              </button>
            );
          })}
        </div>

        {/* ════════ Post list — hairline-divided editorial rows ════════ */}
        <div className="mt-2">
          {visible.length === 0 ? (
            <p className="py-16 text-center font-sans text-sm text-ink-soft">
              No posts in this category yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {visible.map((p, i) => (
                <li key={p.slug}>
                  <Reveal delay={i * 0.05}>
                    <Link
                      to={`/blog/${p.slug}`}
                      className="group grid items-start gap-x-8 gap-y-4 py-8 md:grid-cols-[auto_1fr_auto] md:py-9"
                    >
                      {/* cover */}
                      <BlogCover
                        post={p}
                        iconSize={84}
                        className="h-32 w-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 md:h-[94px] md:w-[150px]"
                      />

                      {/* title + excerpt */}
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                          {p.category}
                        </p>
                        <h3 className="mt-2 font-headline text-xl font-bold leading-[1.12] tracking-[-0.02em] text-ink transition-colors group-hover:text-ink-soft sm:text-2xl">
                          {p.title}
                        </h3>
                        <p className="mt-2 max-w-2xl font-sans text-[15px] leading-relaxed text-ink-soft">
                          {p.excerpt}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink">
                          <span className="border-b border-ink/30 pb-0.5 transition-colors group-hover:border-glow group-hover:text-glow">
                            Read
                          </span>
                          <ArrowUpRight
                            size={13}
                            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                        </span>
                      </div>

                      {/* meta column */}
                      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint md:flex-col md:items-end md:gap-1.5 md:pt-1 md:text-right">
                        <span>{formatDate(p.date)}</span>
                        <span aria-hidden className="md:hidden">·</span>
                        <span>{p.readMins} min</span>
                      </div>
                    </Link>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ════════ Newsletter — paper-dim emphasis band ════════ */}
      <section className="bg-paper-dim py-20 lg:py-24">
        <div className="container-site">
          <Reveal>
            <SectionHeading
              eyebrow="Stay in the loop"
              title="One email when early access opens"
              align="center"
            />
          </Reveal>
          <Reveal delay={0.1}>
            {status === "done" ? (
              <div className="mx-auto mt-8 flex max-w-md items-start gap-2.5 border border-glow/40 bg-glow/[0.07] px-4 py-3.5">
                <Check size={17} className="mt-0.5 shrink-0 text-glow" />
                <p className="font-sans text-sm leading-relaxed text-ink">
                  You're on the list. We'll send a single email the day early access
                  opens — nothing else.
                </p>
              </div>
            ) : (
              <form onSubmit={subscribe} noValidate className="mx-auto mt-8 max-w-md">
                <div className="flex items-stretch gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (err) setErr(null);
                    }}
                    disabled={status === "loading"}
                    placeholder="you@studio.com"
                    aria-label="Email address"
                    className={cn(
                      "h-12 flex-1 border bg-paper px-3.5 font-sans text-sm text-ink transition-all placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-60",
                      err ? "border-danger" : "border-ink/25 focus:border-ink"
                    )}
                  />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="group btn btn-solid h-12 px-6"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      Notify me
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
                </div>
                {err && (
                  <p className="mt-2.5 text-center font-mono text-[11px] tracking-[0.02em] text-danger">
                    {err}
                  </p>
                )}
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
