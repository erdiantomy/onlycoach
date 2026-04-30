import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useSession } from "@/hooks/useSession";

export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  if (sessionLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="brutal-card-sm px-5 py-3 font-display text-sm uppercase tracking-wide">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};
export default RequireAdmin;
