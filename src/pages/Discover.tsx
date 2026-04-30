import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { CoachCard, type CoachCardData } from "@/components/coach/CoachCard";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const NICHES = ["All", "Strength", "Mindset", "Endurance", "Nutrition", "Yoga", "Business"] as const;
type NicheFilter = (typeof NICHES)[number];

const Discover = () => {
  const [query, setQuery] = useState("");
  const [niche, setNiche] = useState<NicheFilter>("All");

  const { data: coaches = [], isLoading } = useQuery<CoachCardData[]>({
    queryKey: ["discover-coaches"],
    queryFn: async () => {
      const { data: cpData, error } = await supabase
        .from("coach_profiles")
        .select("user_id, niche, rating, subscriber_count, profiles(handle, display_name, avatar_url, headline, bio)")
        .eq("is_published", true)
        .order("subscriber_count", { ascending: false });

      if (error) throw error;
      const rawCoaches = cpData ?? [];

      const coachIds = rawCoaches.map((c) => c.user_id);
      const tierMap: Map<string, number> = new Map();

      if (coachIds.length > 0) {
        const { data: tierData } = await supabase
          .from("subscription_tiers")
          .select("coach_id, price_cents")
          .in("coach_id", coachIds)
          .eq("is_active", true);

        for (const t of tierData ?? []) {
          const existing = tierMap.get(t.coach_id);
          if (existing === undefined || t.price_cents < existing) {
            tierMap.set(t.coach_id, t.price_cents);
          }
        }
      }

      return rawCoaches.map((c) => ({
        user_id: c.user_id,
        niche: c.niche,
        rating: c.rating,
        subscriber_count: c.subscriber_count,
        lowestPriceCents: tierMap.get(c.user_id) ?? null,
        profiles: c.profiles as unknown as CoachCardData["profiles"],
      }));
    },
  });

  const results = useMemo(() => {
    return coaches.filter((c) => {
      const matchNiche = niche === "All" || c.niche === niche;
      const q = query.trim().toLowerCase();
      if (!q) return matchNiche;
      const p = c.profiles;
      const matchQuery =
        p?.display_name.toLowerCase().includes(q) ||
        p?.headline?.toLowerCase().includes(q) ||
        p?.handle.toLowerCase().includes(q);
      return matchNiche && matchQuery;
    });
  }, [coaches, query, niche]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-5xl">Discover coaches</h1>
          <p className="mt-2 text-muted-foreground">Verified coaches, ready when you are.</p>
        </header>

        <div className="brutal-card-sm sticky top-20 z-10 mb-8 flex flex-col gap-3 p-3 md:top-24 md:flex-row md:items-center">
          <label className="flex flex-1 items-center gap-2 border-2 border-ink bg-surface px-3 py-2">
            <Search className="h-4 w-4" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, niche, or keyword"
              className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </label>
          <div className="flex gap-1 overflow-x-auto md:flex-wrap md:overflow-visible">
            {NICHES.map((n) => (
              <button
                key={n}
                onClick={() => setNiche(n)}
                className={cn(
                  "shrink-0 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  niche === n ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="brutal-card-sm animate-pulse overflow-hidden">
                <div className="aspect-[4/5] border-b-2 border-ink bg-surface" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-24 bg-surface border border-ink" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && results.length === 0 && (
          <div className="brutal-card p-10 text-center">
            {coaches.length === 0 ? (
              <>
                <p className="font-display text-xl">No coaches yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Be the first!{" "}
                  <a href="/auth?mode=signup&role=coach" className="underline">
                    Apply to be a coach →
                  </a>
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-xl">No coaches match.</p>
                <p className="mt-2 text-sm text-muted-foreground">Try a different niche or keyword.</p>
              </>
            )}
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((c) => (
              <CoachCard key={c.user_id} coach={c} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Discover;
