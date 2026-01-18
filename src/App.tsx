// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { HelmetProvider } from '@dr.pogodin/react-helmet';
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteAssetsProvider } from "@/hooks/useSiteAssets";
import { CartProvider } from "@/hooks/useCart";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { AppPrefetch } from "@/AppPrefetch"; //

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Equipment = lazy(() => import("./pages/Equipment"));
const EquipmentItem = lazy(() => import("./pages/EquipmentItem"));
const About = lazy(() => import("./pages/About"));
const Cart = lazy(() => import("./pages/Cart"));
const Contact = lazy(() => import("./pages/Contact"));
const Book = lazy(() => import("./pages/Book"));
const Admin = lazy(() => import("./pages/Admin"));
const Login = lazy(() => import("./pages/Login"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const BookerDashboard = lazy(() => import("./pages/BookerDashboard"));
const SeoDemo = lazy(() => import("./pages/SeoDemo"));
const SeoTest = lazy(() => import("./pages/SeoTest"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Invoice = lazy(() => import("./pages/Invoice"));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const ScrollLockGuard = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const releaseScrollLock = () => {
      const hasOpenDialog = document.querySelector(
        '[data-state="open"][data-radix-dialog-content], [data-state="open"][data-radix-dialog-overlay]'
      );

      if (hasOpenDialog) {
        return;
      }

      const body = document.body;
      const html = document.documentElement;
      if (!body || !html) {
        return;
      }

      const cleanupStyle = (element: HTMLElement) => {
        element.style.removeProperty("overflow");
        element.style.removeProperty("padding-right");
        element.style.removeProperty("position");
        element.style.removeProperty("top");
        element.style.removeProperty("left");
        element.style.removeProperty("right");
        element.style.removeProperty("width");
        element.style.removeProperty("height");
        element.style.removeProperty("touch-action");
        element.style.removeProperty("transform");
      };

      cleanupStyle(body);
      cleanupStyle(html);
      body.removeAttribute("data-scroll-locked");
      html.removeAttribute("data-scroll-locked");
    };

    const timeouts: number[] = [];
    const isScrollLocked = () => {
      const body = document.body;
      const html = document.documentElement;
      if (!body || !html) {
        return false;
      }

      return (
        body.hasAttribute("data-scroll-locked") ||
        html.hasAttribute("data-scroll-locked") ||
        body.style.overflow === "hidden" ||
        html.style.overflow === "hidden" ||
        body.style.position === "fixed"
      );
    };

    const scheduleRelease = () => {
      if (!isScrollLocked()) {
        return;
      }

      releaseScrollLock();
      timeouts.push(window.setTimeout(releaseScrollLock, 150));
      timeouts.push(window.setTimeout(releaseScrollLock, 600));
    };

    scheduleRelease();
    window.addEventListener("resize", scheduleRelease);
    window.addEventListener("orientationchange", scheduleRelease);
    const observer = new MutationObserver(scheduleRelease);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "data-scroll-locked"] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-scroll-locked"] });

    return () => {
      window.removeEventListener("resize", scheduleRelease);
      window.removeEventListener("orientationchange", scheduleRelease);
      observer.disconnect();
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [location.pathname]);

  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppPrefetch /> {/* ✅ altijd prefetch de equipment producten */}
      <TooltipProvider>
        <AuthProvider>
          <SiteAssetsProvider>
            <CartProvider>
              <Toaster />
              <Sonner />
              <ErrorBoundary>
                <HelmetProvider>
                  <BrowserRouter
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true,
                    }}
                  >
                    <ScrollLockGuard />
                    <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/about-us" element={<About />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/equipment" element={<Equipment />} />
                      <Route path="/equipment/:slug" element={<EquipmentItem />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/book" element={<Book />} />
                      <Route path="/cart" element={<Cart />} />

                      {/* Protected Routes */}
                      <Route
                        element={<ProtectedRoute allowedRoles={["Admin", "SuperUser"]} />}
                      >
                        <Route path="/admin" element={<Admin />} />
                      </Route>

                      <Route
                        element={<ProtectedRoute allowedRoles={["Driver"]} />}
                      >
                        <Route path="/driver-dashboard" element={<DriverDashboard />} />
                      </Route>

                      <Route
                        element={<ProtectedRoute allowedRoles={["Customer"]} />}
                      >
                        <Route path="/customer-dashboard" element={<CustomerDashboard />} />
                      </Route>

                      <Route
                        element={
                          <ProtectedRoute allowedRoles={["Booker", "Admin", "SuperUser"]} />
                        }
                      >
                        <Route path="/booker" element={<BookerDashboard />} />
                      </Route>

                      <Route path="/contact" element={<Contact />} />
                      <Route path="/seo-demo" element={<SeoDemo />} />
                      <Route path="/seo-test" element={<SeoTest />} />
                      <Route path="/invoice/:id" element={<Invoice />} />

                      {/* Catch all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    </Suspense>
                  </BrowserRouter>
                </HelmetProvider>
              </ErrorBoundary>
            </CartProvider>
          </SiteAssetsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
