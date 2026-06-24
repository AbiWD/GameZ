import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import CreateBooking from "./pages/CreateBooking";
import Stations from "./pages/Stations";
import SessionManagement from "./pages/SessionManagement";
import Properties from "./pages/Properties";
import NotFound from "./pages/NotFound";
import WebsiteContent from "./pages/WebsiteContent";
import BrandSettings from "./pages/BrandSettings";
import Analytics from "./pages/Analytics";

import { PropertyProvider } from "@/contexts/PropertyContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PropertyProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/bookings" element={<Bookings />} />
            <Route path="/admin/create-booking" element={<CreateBooking />} />
            <Route path="/admin/stations" element={<Stations />} />
            <Route path="/admin/properties" element={<Properties />} />
            <Route path="/admin/session-management" element={<SessionManagement />} />
            <Route path="/admin/brand-settings" element={<BrandSettings />} />
            <Route path="/admin/website-content" element={<WebsiteContent />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </PropertyProvider>
  </QueryClientProvider>
);

export default App;
