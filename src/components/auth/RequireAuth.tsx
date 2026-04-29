import { Navigate, useLocation } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

type ProfileState = "loading" | "complete" | "incomplete";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useSession();
  const location = useLocation();
  const [profileState, setProfileState] = useState<ProfileState>("loading");

  useEffect(() => {
    if (!user) return;
    // Don't recheck if already on onboarding
    if (location.pathname === "/onboarding") {
      setProfileState("complete");
      return;
    }
    supabase
      .from("profiles")
      .select("display_name, handle")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const isIncomplete =
          !data ||
          !data.display_name?.trim() ||
          !data.handle?.trim() ||
          data.handle === user.email?.split("@")[0];
        setProfileState(isIncomplete ? "incomplete" : "complete");
      });
  }, [user, location.pathname]);

  if (loading || (user && profileState === "loading")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="brutal-card-sm px-5 py-3 font-display text-sm uppercase tracking-wide">
          Loading…
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (profileState === "incomplete") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
