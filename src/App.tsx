import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
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
import FamilyPlanningForm from "./pages/FamilyPlanningForm";
import AddNewForm from "./pages/AddNewForm";
import ResidentRecords from "./pages/ResidentRecords";
import AdminDashboard from "./pages/AdminDashboard";
import AdminResidents from "./pages/AdminResidents";
import AdminWorkers from "./pages/AdminWorkers";
import AdminHealthRecords from "./pages/AdminHealthRecords";
import AdminSettings from "./pages/AdminSettings";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import About from "./pages/About";
import CalendarPage from "./pages/Calendar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Layout><Index /></Layout></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><Layout><About /></Layout></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
            <Route path="/forms/family-data" element={<ProtectedRoute><Layout><FamilyDataForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/consultation" element={<ProtectedRoute><Layout><ConsultationForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/philpen-health" element={<ProtectedRoute><Layout><PhilPenHealthForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/dengue-prevention" element={<ProtectedRoute><Layout><DenguePreventionForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/maternal-care" element={<ProtectedRoute><Layout><MaternalCareForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/child-health" element={<ProtectedRoute><Layout><ChildHealthForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/family-planning" element={<ProtectedRoute><Layout><FamilyPlanningForm /></Layout></ProtectedRoute>} />
            <Route path="/forms/add-new" element={<ProtectedRoute><Layout><AddNewForm /></Layout></ProtectedRoute>} />
            <Route path="/residents" element={<ProtectedRoute><Layout><ResidentRecords /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
            <Route path="/admin/residents" element={<ProtectedRoute><Layout><AdminResidents /></Layout></ProtectedRoute>} />
            <Route path="/admin/workers" element={<ProtectedRoute><Layout><AdminWorkers /></Layout></ProtectedRoute>} />
            <Route path="/admin/health" element={<ProtectedRoute><Layout><AdminHealthRecords /></Layout></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><Layout><AdminSettings /></Layout></ProtectedRoute>} />
            <Route path="/admin/forms/family-data" element={<ProtectedRoute><Layout><FamilyDataForm /></Layout></ProtectedRoute>} />
            <Route path="/admin/forms/consultation" element={<ProtectedRoute><Layout><ConsultationForm /></Layout></ProtectedRoute>} />
            <Route path="/admin/forms/philpen-health" element={<ProtectedRoute><Layout><PhilPenHealthForm /></Layout></ProtectedRoute>} />
            <Route path="/admin/forms/dengue-prevention" element={<ProtectedRoute><Layout><DenguePreventionForm /></Layout></ProtectedRoute>} />
            <Route path="/admin/forms/maternal-care" element={<ProtectedRoute><Layout><MaternalCareForm /></Layout></ProtectedRoute>} />
            <Route path="/admin/forms/child-health" element={<ProtectedRoute><Layout><ChildHealthForm /></Layout></ProtectedRoute>} />
            <Route path="/admin/forms/family-planning" element={<ProtectedRoute><Layout><FamilyPlanningForm /></Layout></ProtectedRoute>} />
            <Route path="/admin/forms/add-new" element={<ProtectedRoute><Layout><AddNewForm /></Layout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </SettingsProvider>
  </QueryClientProvider>
);

export default App;
