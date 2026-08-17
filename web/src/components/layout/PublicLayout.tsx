import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { GoToTop } from "./GoToTop";
import { EarlyAccessPopup } from "./EarlyAccessPopup";
import { useScrollToTop } from "@/hooks/useScrollToTop";

export function PublicLayout() {
  useScrollToTop();
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Header />
      <main className="flex-1 bg-paper bp-grid">
        <Outlet />
      </main>
      {/* crisp separation between page content and the dark footer slab */}
      <div className="bg-paper">
        <div className="container-site h-px bg-line" />
        <div className="h-10" />
      </div>
      <Footer />
      <GoToTop />
      <EarlyAccessPopup />
    </div>
  );
}
