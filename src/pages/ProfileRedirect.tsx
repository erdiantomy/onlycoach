import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import NotFound from "./NotFound";

const ProfileRedirect = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<"coach" | "mentee" | null>({
    queryKey: ["profile-role", handle],
    enabled: !!handle,
    queryFn: async () => {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("handle", handle!)
        .maybeSingle();
      if (pErr || !profile) return null;

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id)
        .eq("role", "coach")
        .maybeSingle();

      return roleRow ? "coach" : "mentee";
    },
  });

  useEffect(() => {
    if (data === "coach") navigate(`/coach/${handle}`, { replace: true });
    else if (data === "mentee") navigate(`/mentee/${handle}`, { replace: true });
  }, [data, handle, navigate]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="animate-pulse font-display text-2xl">Loading…</div>
        </div>
      </AppShell>
    );
  }

  if (error || data === null) return <NotFound />;

  // Redirecting — render nothing
  return null;
};

export default ProfileRedirect;
