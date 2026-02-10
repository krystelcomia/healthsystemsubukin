import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
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
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/forms/family-data" element={<FamilyDataForm />} />
            <Route path="/forms/consultation" element={<ConsultationForm />} />
            <Route path="/forms/philpen-health" element={<PhilPenHealthForm />} />
            <Route path="/forms/dengue-prevention" element={<DenguePreventionForm />} />
            <Route path="/forms/maternal-care" element={<MaternalCareForm />} />
            <Route path="/forms/child-health" element={<ChildHealthForm />} />
            <Route path="/residents" element={<ResidentRecords />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
