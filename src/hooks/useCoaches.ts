import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { coaches as mockCoaches, type Coach } from "@/lib/mock";

interface RawCoachRow {
  user_id: string;
  niche: string | null;
  rating: number | null;
  subscriber_count: number | null;
  is_published: boolean | null;
  profiles: {
    handle: string | null;
    display_name: string | null;
    headline: string | null;
    bio: string | null;
    avatar_url: string | null;
  } | null;
  subscription_tiers: Array<{
    id: string;
    name: string;
    price_cents: number;
    perks: string[] | null;
    sort_order: number;
    is_active: boolean;
  }>;
}

const fetchCoaches = async (): Promise<{ coaches: Coach[]; source: "supabase" | "mock" }> => {
  const { data, error } = await supabase
    .from("coach_profiles")
    .select(`
      user_id,
      niche,
      rating,
      subscriber_count,
      is_published,
      profiles:profiles!coach_profiles_user_id_fkey ( handle, display_name, headline, bio, avatar_url ),
      subscription_tiers ( id, name, price_cents, perks, sort_order, is_active )
    `)
    .eq("is_published", true)
    .limit(50);

  if (error) throw error;
  const rows = (data as unknown as RawCoachRow[] | null) ?? [];
  if (rows.length === 0) return { coaches: mockCoaches, source: "mock" };

  const mapped: Coach[] = rows.map((r) => ({
    id: r.user_id,
    handle: r.profiles?.handle ?? r.user_id.slice(0, 6),
    name: r.profiles?.display_name ?? "Unnamed coach",
    niche: ((r.niche as Coach["niche"]) ?? "Business"),
    headline: r.profiles?.headline ?? "",
    bio: r.profiles?.bio ?? "",
    rating: Number(r.rating ?? 5),
    subscribers: r.subscriber_count ?? 0,
    tiers: (r.subscription_tiers ?? [])
      .filter((t) => t.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => ({
        id: t.id,
        name: t.name,
        // IDR cents → USD-equivalent so formatIdr() renders right.
        price: Math.round((t.price_cents ?? 0) / 16000),
        perks: t.perks ?? [],
      })),
  }));
  return { coaches: mapped, source: "supabase" };
};

/**
 * Cached, deduped fetch of published coaches via react-query.
 *
 * - 60s staleTime so a few back-to-back navigations between Discover,
 *   Trending, and CoachProfile share one network call.
 * - On error or empty result, falls back to mock data so the UI is
 *   never blank in dev.
 */
export const useCoaches = () => {
  const query = useQuery({
    queryKey: ["coaches", "published"],
    queryFn: fetchCoaches,
    staleTime: 60_000,
    placeholderData: { coaches: mockCoaches, source: "mock" as const },
  });

  return {
    coaches: query.data?.coaches ?? mockCoaches,
    loading: query.isLoading,
    source: query.data?.source ?? "mock",
  };
};
