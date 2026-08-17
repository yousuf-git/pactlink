import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Early access" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

const MENU_EASE = [0.16, 1, 0.3, 1] as const;

const ITEM_VARIANTS = {
  open: { opacity: 1, y: 0, transition: { duration: 0.28, ease: MENU_EASE } },
  closed: { opacity: 0, y: -6, transition: { duration: 0.15, ease: MENU_EASE } },
};

// Minimal editorial navbar — letter-spaced wordmark left, centered nav,
// restrained actions right. Space Grotesk, monochrome ink on warm paper.
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setHidden(y > last && y > 160);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "sticky top-0 z-40 transition-colors duration-200",
        scrolled ? "border-b border-[#16181C]/10 bg-[#F2F0EB]/90 backdrop-blur-md" : "border-b border-transparent"
      )}
    >
      <div className="container-site relative flex h-16 items-center justify-between">
        {/* wordmark */}
        <Link
          to="/"
          aria-label="PactLink home"
          className="transition-opacity hover:opacity-70"
        >
          <Logo className="text-[1.6rem] tracking-[-0.04em]" />
        </Link>

        {/* centered nav */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "font-grotesk text-[13px] tracking-wide transition-colors",
                  isActive
                    ? "border-b border-[#16181C] pb-0.5 font-medium text-[#16181C]"
                    : "font-normal text-[#565A61] hover:text-[#16181C]"
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* actions */}
        <div className="hidden items-center gap-6 md:flex">
          <button
            onClick={() => navigate("/login")}
            className="font-grotesk text-[13px] text-[#565A61] transition-colors hover:text-[#16181C]"
          >
            Log in
          </button>
          <button onClick={() => navigate("/sandbox-login")} className="btn btn-sm btn-solid">
            Open sandbox
          </button>
        </div>

        <button
          className="relative h-[38px] w-[38px] text-[#16181C] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={open ? "close" : "open"}
              initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.18, ease: MENU_EASE }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: MENU_EASE }}
            className="overflow-hidden border-t border-[#16181C]/10 bg-[#F2F0EB] md:hidden"
          >
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } },
                closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
              }}
              className="container-site flex flex-col gap-1 py-4"
            >
              {NAV.map((n) => (
                <motion.div key={n.to} variants={ITEM_VARIANTS}>
                  <NavLink
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "block px-1 py-2.5 font-grotesk text-sm tracking-wide",
                        isActive ? "font-medium text-[#16181C]" : "text-[#565A61]"
                      )
                    }
                  >
                    {n.label}
                  </NavLink>
                </motion.div>
              ))}
              <motion.div
                variants={ITEM_VARIANTS}
                className="mt-3 flex flex-col gap-2 border-t border-[#16181C]/10 pt-4"
              >
                <button
                  onClick={() => { setOpen(false); navigate("/login"); }}
                  className="btn btn-outline w-full"
                >
                  Log in
                </button>
                <button
                  onClick={() => { setOpen(false); navigate("/sandbox-login"); }}
                  className="btn btn-solid w-full"
                >
                  Open sandbox
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
