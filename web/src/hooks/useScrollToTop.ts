import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Scroll to top on public route changes (not used inside the dashboard).
export function useScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
}
