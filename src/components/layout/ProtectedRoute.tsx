import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    // You might want to show a loading spinner here
    return <div className="min-h-screen flex flex-col items-center justify-center"><p>Loading...</p></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // User is logged in but does not have the required role
    // Redirect to a generic dashboard or an unauthorized page
    // For simplicity, redirecting to home. Consider an '/unauthorized' page.
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;