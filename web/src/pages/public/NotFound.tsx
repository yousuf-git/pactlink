import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function NotFound() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-20 text-center">
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-glow" />
        ERROR · 404 · NOT_FOUND
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
        className="mt-6 font-headline font-bold leading-[0.82] tracking-[-0.05em] text-ink"
        style={{ fontSize: "clamp(6rem, 28vw, 16rem)" }}
        aria-label="404"
      >
        404<span style={{ color: "#C99A4B" }}>.</span>
      </motion.h1>

      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.24, ease: EASE }}
        className="mt-2 max-w-xl font-headline text-2xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-3xl"
      >
        This page took a different path.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-4 max-w-md font-sans text-[15px] leading-relaxed text-ink-soft"
      >
        The link may be broken, or the page may have moved. Let's get you back to
        something useful.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.52, ease: EASE }}
        className="mt-9 flex flex-col items-center gap-5 sm:flex-row"
      >
        <Link
          to="/"
          className="group btn btn-solid"
        >
          Back home
          <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          to="/sandbox-login"
          className="border-b border-ink pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:border-glow hover:text-ink-soft"
        >
          Open the sandbox
        </Link>
      </motion.div>
    </section>
  );
}
