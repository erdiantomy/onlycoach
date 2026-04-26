import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useSession } from "@/hooks/useSession";

/**
 * Wraps any route that requires authentication.
 * While the auth state hydrates we render a small, on-brand placeholder.
 */
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="brutal-card-sm px-5 py-3 font-display text-sm uppercase tracking-wide">
          Loading…
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

export default RequireAuth;
