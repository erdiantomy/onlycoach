import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

export function useAdminRole() {
  const { user, loading: sessionLoading } = useSession();

  const { data: isAdmin = false, isLoading } = useQuery<boolean>({
    queryKey: ["admin-role", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    staleTime: 60_000,
  });

  return { isAdmin, loading: sessionLoading || isLoading };
}
