import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import { LoadingBlock } from "@/components/ui/Misc";

// Public pages (small, eagerly bundled).
import Home from "@/pages/public/Home";
import About from "@/pages/public/About";
import HowItWorks from "@/pages/public/HowItWorks";
import Pricing from "@/pages/public/Pricing";
import Blog from "@/pages/public/Blog";
import BlogPost from "@/pages/public/BlogPost";
import Contact from "@/pages/public/Contact";
import Privacy from "@/pages/public/Privacy";
import Terms from "@/pages/public/Terms";
import StaffLogin from "@/pages/public/StaffLogin";
import SandboxLogin from "@/pages/public/SandboxLogin";
import NotFound from "@/pages/public/NotFound";

// Client approval page (heavy: Stripe + signature_pad) — code-split.
const ClientApproval = lazy(() => import("@/pages/public/ClientApproval"));

// Dashboard is code-split so the public bundle stays lean (react-best-practices
// bundle-dynamic-imports).
const DashboardLayout = lazy(() => import("@/pages/dashboard/DashboardLayout"));
const Overview = lazy(() => import("@/pages/dashboard/Overview"));
const Quotes = lazy(() => import("@/pages/dashboard/Quotes"));
const QuoteBuilder = lazy(() => import("@/pages/dashboard/QuoteBuilder"));
const Pipeline = lazy(() => import("@/pages/dashboard/Pipeline"));
const Analytics = lazy(() => import("@/pages/dashboard/Analytics"));
const Webhooks = lazy(() => import("@/pages/dashboard/Webhooks"));
const Clients = lazy(() => import("@/pages/dashboard/Clients"));
const Settings = lazy(() => import("@/pages/dashboard/Settings"));

// Platform-admin console — code-split.
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminQuotes = lazy(() => import("@/pages/admin/AdminQuotes"));
const AdminClients = lazy(() => import("@/pages/admin/AdminClients"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminLogs = lazy(() => import("@/pages/admin/AdminLogs"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingBlock />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* Public marketing site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
        </Route>

        {/* Auth (no public chrome) */}
        <Route path="/login" element={<StaffLogin />} />
        <Route path="/sandbox-login" element={<SandboxLogin />} />

        {/* Client approval page — UNAUTHENTICATED, tokenized */}
        <Route path="/q/:token" element={<ClientApproval />} />

        {/* Owner dashboard — protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="quotes/new" element={<QuoteBuilder />} />
          <Route path="quotes/:id/edit" element={<QuoteBuilder />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="webhooks" element={<Webhooks />} />
          <Route path="clients" element={<Clients />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Platform admin console — protected, role: admin */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="quotes" element={<AdminQuotes />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
