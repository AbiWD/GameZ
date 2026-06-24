import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LocationNotFound from "./pages/LocationNotFound";

import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import BookingPolicy from "./pages/BookingPolicy";
import CheckBooking from "./pages/CheckBooking";
import PaymentStatus from "./pages/PaymentStatus";
import ScrollToTop from "./components/ScrollToTop";
import { PropertyProvider, useProperty } from "./contexts/PropertyContext";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { properties } = useProperty();
  
  // Auto-detection configuration
  const isMultiProperty = properties.length > 1;

  return (
    <Routes>
      {/* Root Path Routing: Unified SPA always load Index */}
      <Route path="/" element={<Index />} />
      
      {/* Fallback for invalid paths/locations */}
      <Route path="/location-not-found" element={<LocationNotFound />} />

      {/* Global Pages */}
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/booking-policy" element={<BookingPolicy />} />
      
      {/* Account / Verification Pages */}
      <Route path="/check-booking" element={<CheckBooking />} />
      <Route path="/payment-status" element={<PaymentStatus />} />

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <BrowserRouter>
        <PropertyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ScrollToTop />
            <AppRoutes />
          </TooltipProvider>
        </PropertyProvider>
      </BrowserRouter>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
