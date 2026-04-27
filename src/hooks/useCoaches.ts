import { useEffect, useState } from "react";
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

/**
 * Fetch published coaches from Supabase, joined with their profile and
 * tiers. Falls back to mock data on error or empty result so the UI is
 * never blank in dev / on a fresh project.
 *
 * Returns Coach[] in the shape the existing UI components already
 * expect (handle/name/niche/headline/bio/rating/subscribers/tiers).
 */
export const useCoaches = () => {
  const [coaches, setCoaches] = useState<Coach[]>(mockCoaches);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "mock">("mock");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
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
        if (cancelled) return;
        if (error) throw error;
        const rows = (data as unknown as RawCoachRow[] | null) ?? [];
        if (rows.length === 0) {
          setCoaches(mockCoaches);
          setSource("mock");
        } else {
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
                // Convert IDR cents → USD-equivalent so the existing
                // formatIdr() helper renders the right amount. The mock
                // layer is in USD-equivalents and DB is IDR cents.
                price: Math.round((t.price_cents ?? 0) / 16000),
                perks: t.perks ?? [],
              })),
          }));
          setCoaches(mapped);
          setSource("supabase");
        }
      } catch {
        if (!cancelled) {
          setCoaches(mockCoaches);
          setSource("mock");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  return { coaches, loading, source };
};
