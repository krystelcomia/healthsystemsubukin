import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ResetPassword from "./pages/ResetPassword";
import FamilyDataForm from "./pages/FamilyDataForm";
import ConsultationForm from "./pages/ConsultationForm";
import PhilPenHealthForm from "./pages/PhilPenHealthForm";
import DenguePreventionForm from "./pages/DenguePreventionForm";
import MaternalCareForm from "./pages/MaternalCareForm";
import ChildHealthForm from "./pages/ChildHealthForm";
import ResidentRecords from "./pages/ResidentRecords";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Layout><Index /></Layout></ProtectedRoute>} />
            <Route path="/forms/family-data" element={<ProtectedRoute><Layout><FamilyDataForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/consultation" element={<ProtectedRoute><Layout><ConsultationForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/philpen-health" element={<ProtectedRoute><Layout><PhilPenHealthForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/dengue-prevention" element={<ProtectedRoute><Layout><DenguePreventionForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/maternal-care" element={<ProtectedRoute><Layout><MaternalCareForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/child-health" element={<ProtectedRoute><Layout><ChildHealthForm /></Layout></ProtectedRoute>} />
            <Route path="/residents" element={<ProtectedRoute><Layout><ResidentRecords /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
