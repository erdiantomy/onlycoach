import { Navigate } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "coach" | "mentee";

interface RequireRoleProps {
  role: AppRole;
  children: ReactNode;
  /** Where to send users who don't have the role. */
  redirectTo?: string;
}

/**
 * Gates a route on both auth + a specific app_role membership.
 *
 * Wraps RequireAuth's job (sends unauthed users to /auth) and adds
 * a role check against user_roles. Admin always passes. While the
 * role check is in flight we show the same on-brand "Loading…"
 * placeholder so the UI doesn't flash.
 *
 * Use for /studio/* surfaces that should only be reachable by
 * creators — combined with an UpgradeNotice fallback would be a
 * nicer UX than a hard redirect, but redirect is the safer default.
 */
export const RequireRole = ({ role, children, redirectTo = "/onboarding" }: RequireRoleProps) => {
  const { user, loading } = useSession();
  const [hasRole, setHasRole] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setHasRole(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", [role, "admin"])
      .then(({ data }) => {
        if (cancelled) return;
        setHasRole((data?.length ?? 0) > 0);
      });
    return () => { cancelled = true; };
  }, [user, role]);

  if (loading || (user && hasRole === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="brutal-card-sm px-5 py-3 font-display text-sm uppercase tracking-wide">
          Loading…
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!hasRole) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
};

export default RequireRole;
