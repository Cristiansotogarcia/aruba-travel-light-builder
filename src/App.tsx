// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { HelmetProvider } from '@dr.pogodin/react-helmet';
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { PasswordChangeGate } from "@/components/auth/PasswordChangeGate";
import { initPerformanceMonitoring } from "@/utils/performanceMonitoring";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteAssetsProvider } from "@/hooks/useSiteAssets";
import { CartProvider } from "@/hooks/useCart";
import { NotificationProvider } from "@/hooks/useNotifications";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { AppPrefetch } from "@/AppPrefetch"; //
import { PageSkeleton } from "@/components/common/SkeletonLoader";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Equipment = lazy(() => import("./pages/Equipment"));
const EquipmentItem = lazy(() => import("./pages/EquipmentItem"));
const About = lazy(() => import("./pages/About"));
const Cart = lazy(() => import("./pages/Cart"));
const Contact = lazy(() => import("./pages/Contact"));
const Book = lazy(() => import("./pages/Book"));
const Admin = lazy(() => import("./pages/Admin"));
const Accounting = lazy(() => import("./pages/Accounting"));
const Login = lazy(() => import("./pages/Login"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const BookerDashboard = lazy(() => import("./pages/BookerDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Invoice = lazy(() => import("./pages/Invoice"));
const DeliverySlip = lazy(() => import("./pages/DeliverySlip"));
const DeliveryTracking = lazy(() => import("./pages/DeliveryTracking"));

// Loading fallback with skeleton
const PageLoader = () => <PageSkeleton />;

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

    // Clean up scroll lock when navigating to a new page
    // This ensures scroll is restored after closing dialogs
    const body = document.body;
    const html = document.documentElement;
    
    if (body && html) {
      // Remove all inline styles that could lock scroll
      body.style.removeProperty("overflow");
      body.style.removeProperty("padding-right");
      body.style.removeProperty("position");
      body.style.removeProperty("top");
      body.style.removeProperty("left");
      body.style.removeProperty("right");
      body.style.removeProperty("width");
      body.style.removeProperty("height");
      body.style.removeProperty("touch-action");
      body.style.removeProperty("transform");
      
      html.style.removeProperty("overflow");
      html.style.removeProperty("padding-right");
      html.style.removeProperty("position");
      html.style.removeProperty("top");
      html.style.removeProperty("left");
      html.style.removeProperty("right");
      html.style.removeProperty("width");
      html.style.removeProperty("height");
      html.style.removeProperty("touch-action");
      html.style.removeProperty("transform");
      
      body.removeAttribute("data-scroll-locked");
      html.removeAttribute("data-scroll-locked");
    }
  }, [location.pathname]);

  return null;
};

const App = () => {
  // Initialize performance monitoring on mount
  useEffect(() => {
    initPerformanceMonitoring();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppPrefetch /> {/* ✅ altijd prefetch de equipment producten */}
      <TooltipProvider>
        <AuthProvider>
          <NotificationProvider>
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
                      <PasswordChangeGate />
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
                          element={<ProtectedRoute allowedRoles={["Accounting", "Admin", "SuperUser"]} />}
                        >
                          <Route path="/accounting" element={<Accounting />} />
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
                        <Route path="/invoice/:id" element={<Invoice />} />
                        <Route path="/track/:token" element={<DeliveryTracking />} />

                        <Route
                          element={
                            <ProtectedRoute allowedRoles={["Admin", "SuperUser", "Accounting", "Booker", "Customer", "Driver"]} />
                          }
                        >
                          <Route path="/delivery-slip/:id" element={<DeliverySlip />} />
                        </Route>

                        {/* Catch all */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      </Suspense>
                    </BrowserRouter>
                  </HelmetProvider>
                </ErrorBoundary>
              </CartProvider>
            </SiteAssetsProvider>
          </NotificationProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
