// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteAssetsProvider } from "@/hooks/useSiteAssets";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { AppPrefetch } from "@/AppPrefetch"; //

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Equipment = lazy(() => import("./pages/Equipment"));
const About = lazy(() => import("./pages/About"));
const Book = lazy(() => import("./pages/Book"));
const Contact = lazy(() => import("./pages/Contact"));
const Admin = lazy(() => import("./pages/Admin"));
const Login = lazy(() => import("./pages/Login"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const BookerDashboard = lazy(() => import("./pages/BookerDashboard"));
const SeoDemo = lazy(() => import("./pages/SeoDemo"));
const SeoTest = lazy(() => import("./pages/SeoTest"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppPrefetch /> {/* ✅ altijd prefetch de equipment producten */}
      <TooltipProvider>
        <AuthProvider>
          <SiteAssetsProvider>
            <Toaster />
            <Sonner />
            <ErrorBoundary>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/about-us" element={<About />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/equipment" element={<Equipment />} />
                    <Route path="/login" element={<Login />} />

                    {/* Protected Routes */}
                    <Route
                      element={
                        <ProtectedRoute allowedRoles={["Customer", "Booker", "Admin", "SuperUser"]} />
                      }
                    >
                      <Route path="/book" element={<Book />} />
                    </Route>

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

                    {/* Catch all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ErrorBoundary>
          </SiteAssetsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
