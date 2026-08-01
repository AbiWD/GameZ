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
import Properties from "./pages/Properties";
import NotFound from "./pages/NotFound";

import Analytics from "./pages/Analytics";
import StaffAccounts from "./pages/StaffAccounts";
import Setup from "./pages/Setup";
import Customers from "./pages/Customers";
import WhatsAppSettings from "./pages/WhatsAppSettings";

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
            <Route path="/admin/auth" element={<Auth />} />
            <Route path="/setup" element={<Setup />} />

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Dashboard />} />

            <Route path="/bookings" element={<Bookings />} />
            <Route path="/admin/bookings" element={<Bookings />} />

            <Route path="/create-booking" element={<CreateBooking />} />
            <Route path="/admin/create-booking" element={<CreateBooking />} />

            <Route path="/stations" element={<Stations />} />
            <Route path="/admin/stations" element={<Stations />} />

            <Route path="/properties" element={<Properties />} />
            <Route path="/admin/properties" element={<Properties />} />

            <Route path="/analytics" element={<Analytics />} />
            <Route path="/admin/analytics" element={<Analytics />} />

            <Route path="/staff" element={<StaffAccounts />} />
            <Route path="/admin/staff" element={<StaffAccounts />} />

            <Route path="/customers" element={<Customers />} />
            <Route path="/admin/customers" element={<Customers />} />

            <Route path="/whatsapp" element={<WhatsAppSettings />} />
            <Route path="/admin/whatsapp" element={<WhatsAppSettings />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </PropertyProvider>
  </QueryClientProvider>
);

export default App;
