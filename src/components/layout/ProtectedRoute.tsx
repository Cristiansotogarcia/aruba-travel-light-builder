import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageSkeleton } from '@/components/common/SkeletonLoader';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  /** Refuse users whose email address has not been confirmed yet. */
  requireConfirmedEmail?: boolean;
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  requireConfirmedEmail,
  children,
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Match the Suspense fallback so every role sees one consistent loading
    // surface on the way into its dashboard instead of a bare "Loading…".
    return <PageSkeleton />;
  }

  if (!user) {
    // Send the user back to the page they asked for once they have signed in.
    const target = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />;
  }

  if (requireConfirmedEmail && !user.email_confirmed_at) {
    // Not back to /login: a signed-in user there is sent on to their role home,
    // which for staff is this same gate, so it would loop.
    return <Navigate to="/" replace />;
  }

  // A role-gated page stays closed until the role is known: a missing profile
  // is treated as no role, not as any role.
  if (allowedRoles && (!profile || !allowedRoles.includes(profile.role))) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
