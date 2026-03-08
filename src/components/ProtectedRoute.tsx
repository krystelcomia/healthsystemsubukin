import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  const isAdminRoute = location.pathname.startsWith("/admin");

  // Supervisor should always be on /admin routes
  if (userRole === "supervisor" && !isAdminRoute) {
    return <Navigate to="/admin" replace />;
  }

  // BHW users should never access /admin routes
  if (userRole === "bhw" && isAdminRoute) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
