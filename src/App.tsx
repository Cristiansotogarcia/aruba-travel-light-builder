
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Equipment from "./pages/Equipment";
import Book from "./pages/Book";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import DriverDashboard from "./pages/DriverDashboard"; // Import DriverDashboard
import CustomerDashboard from "./pages/CustomerDashboard"; // Import CustomerDashboard
import BookerDashboard from "./pages/BookerDashboard"; // Import BookerDashboard
import NotFound from "./pages/NotFound";
import ProtectedRoute from "@/components/layout/ProtectedRoute"; // Import ProtectedRoute

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/book" element={<Book />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['Admin', 'SuperUser']} />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['Driver']} />}>
              <Route path="/driver-dashboard" element={<DriverDashboard />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['Customer']} />}> 
              <Route path="/customer-dashboard" element={<CustomerDashboard />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['Booker', 'Admin', 'SuperUser']} />}>
              {/* Booker role can access their dashboard. Admin/SuperUser might also need access for impersonation or support. */}
              <Route path="/booker" element={<BookerDashboard />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
