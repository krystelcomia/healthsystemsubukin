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

  const isAdmin = userRole === "supervisor";
  const isNonAdmin = userRole === "bhw" || userRole === "bns" || userRole === "BNS" || userRole === "supervisory";

  // Supervisor should always be on /admin routes
  if (isAdmin && !isAdminRoute) {
    return <Navigate to="/admin" replace />;
  }

  // Non-admin users should never access /admin routes
  if (isNonAdmin && isAdminRoute) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
