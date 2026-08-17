import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Clock } from "lucide-react";
import { Reveal } from "@/components/sections/Section";
import { BlogCover } from "@/components/sections/BlogCover";
import { blogPosts } from "@/data/blog";
import { formatDate } from "@/lib/utils";

const INK_SHADOW = "0 34px 70px -28px rgba(22,24,28,0.55)";

// Editorial monochrome article. Dark embedded hero at top (title + meta over
// a masked icon, mirrors the featured card), an Inter reading column with a
// sticky meta rail, then a dark CTA + "keep reading" grid.
export default function BlogPost() {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="container-site py-28 text-center">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
          404 · not found
        </p>
        <h1 className="mt-4 font-headline text-4xl font-bold tracking-[-0.025em] text-ink">
          Post not found
        </h1>
        <p className="mt-3 font-sans text-ink-soft">That article may have moved.</p>
        <Link
          to="/blog"
          className="mt-7 inline-flex items-center gap-2 border-b border-ink pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:border-glow hover:text-ink-soft"
        >
          <ArrowLeft size={14} /> Back to the blog
        </Link>
      </div>
    );
  }

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);
  const Icon = post.coverIcon;

  return (
    <article className="container-site py-12 lg:py-16">
      {/* ── back link ── */}
      <Reveal>
        <Link
          to="/blog"
          className="group inline-flex items-center gap-2 border-b border-ink pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:border-glow hover:text-ink-soft"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          All posts
        </Link>
      </Reveal>

      {/* ── dark embedded hero ── */}
      <Reveal delay={0.05}>
        <header
          className="relative isolate mt-8 overflow-hidden bg-ink p-8 text-paper sm:p-12 lg:p-14"
          style={{ boxShadow: INK_SHADOW }}
        >
          <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(135deg, transparent 0%, transparent 58%, rgba(201,154,65,0.1) 58%, rgba(201,154,65,0.1) 60%, transparent 60%)",
            }}
          />
          <span aria-hidden className="absolute right-5 top-5 h-2 w-2 rounded-full bg-glow" />
          <Icon
            aria-hidden
            strokeWidth={0.8}
            className="pointer-events-none absolute -bottom-12 -right-8 text-paper/[0.07]"
            style={{ width: 300, height: 300 }}
          />

          <div className="relative max-w-3xl">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper/55">
              <span className="text-glow">{post.category}</span>
              <span className="text-paper/30">/</span>
              <span>{formatDate(post.date)}</span>
              <span className="text-paper/30">/</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} /> {post.readMins} min read
              </span>
            </div>

            <h1 className="mt-6 font-headline text-[2.1rem] font-bold leading-[1.02] tracking-[-0.03em] text-paper sm:text-[3rem] lg:text-[3.4rem]">
              {post.title}
            </h1>

            <div className="mt-8 flex items-center gap-3 border-t border-paper/15 pt-5">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center bg-paper font-grotesk text-[13px] font-semibold text-ink"
              >
                {post.author.charAt(0)}
              </span>
              <span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-paper/45">
                  Written by
                </span>
                <span className="block font-grotesk text-sm font-medium text-paper">
                  {post.author}
                </span>
              </span>
            </div>
          </div>
        </header>
      </Reveal>

      {/* ── body + sticky meta rail ── */}
      <Reveal delay={0.1}>
        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_232px] lg:gap-16">
          <div className="max-w-[44rem]">
            {/* lede */}
            <p className="border-l-2 border-glow pl-5 font-headline text-[1.35rem] font-medium leading-[1.45] tracking-[-0.01em] text-ink sm:text-[1.5rem]">
              {post.body[0]}
            </p>

            <div className="mt-9 space-y-6">
              {post.body.slice(1).map((para, i) => (
                <p key={i} className="font-sans text-[1.05rem] leading-[1.8] text-ink-soft">
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* sticky rail — fills the right column on large screens */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 border-l border-line pl-6">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                Article
              </p>
              <dl className="mt-4 space-y-3.5">
                {[
                  ["Topic", post.category],
                  ["Author", post.author],
                  ["Published", formatDate(post.date)],
                  ["Read time", `${post.readMins} min`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">{k}</dt>
                    <dd className="mt-0.5 font-grotesk text-sm text-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 border-t border-line pt-5">
                <p className="font-sans text-[13px] leading-relaxed text-ink-soft">
                  See the flow this post describes — running, with example data.
                </p>
                <Link
                  to="/sandbox-login"
                  className="group mt-3 inline-flex items-center gap-2 border-b border-ink pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:border-glow hover:text-ink-soft"
                >
                  Open the sandbox
                  <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>

              <p className="mt-6 border-t border-line pt-5 font-mono text-[10px] leading-relaxed tracking-[0.04em] text-ink-faint">
                draft → sent → viewed → approved → <span className="text-glow">deposit_paid</span>
              </p>
            </div>
          </aside>
        </div>
      </Reveal>

      {/* ── keep reading ── */}
      <Reveal delay={0.05}>
        <section className="mt-20 border-t border-line pt-10">
          <h3 className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
            Keep reading
          </h3>
          <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                to={`/blog/${r.slug}`}
                className="group flex flex-col bg-paper p-6 transition-colors hover:bg-paper-dim"
              >
                <BlogCover post={r} iconSize={108} className="mb-5 h-28 w-full" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  {r.category}
                </span>
                <p className="mt-3 font-headline text-lg font-bold leading-[1.2] tracking-[-0.015em] text-ink">
                  {r.title}
                </p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">
                  {r.excerpt}
                </p>
                <span className="mt-5 inline-flex w-max items-center gap-2 border border-ink px-3.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors group-hover:bg-ink group-hover:text-paper">
                  Read article
                  <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>
    </article>
  );
}
