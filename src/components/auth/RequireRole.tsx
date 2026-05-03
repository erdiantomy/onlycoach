import { Navigate } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Role = Database["public"]["Enums"]["app_role"];

/**
 * Wraps any route that requires the signed-in user to hold a specific
 * role. Non-coaches landing on /studio* get bounced to /onboarding so
 * they can opt in, rather than seeing a coach dashboard they're not
 * authorized to manage. While the role check is in flight we render a
 * lightweight placeholder consistent with RequireAuth.
 */
export const RequireRole = ({
  role,
  children,
  fallback = "/onboarding",
}: {
  role: Role;
  children: ReactNode;
  fallback?: string;
}) => {
  const { user, loading } = useSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAllowed(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", role)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setAllowed(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, role]);

  if (loading || allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="brutal-card-sm px-5 py-3 font-display text-sm uppercase tracking-wide">
          Loading…
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!allowed) return <Navigate to={fallback} replace />;
  return <>{children}</>;
};

export default RequireRole;
