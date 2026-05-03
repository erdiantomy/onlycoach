import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { CoachCard, type CoachCardData } from "@/components/coach/CoachCard";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const niches = ["All", "Strength", "Mindset", "Endurance", "Nutrition", "Yoga", "Business", "Other"] as const;
type NicheFilter = (typeof niches)[number];

interface CoachRow {
  id: string;
  handle: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  coach_profiles: {
    niche: string;
    rating: number;
    subscriber_count: number;
    is_published: boolean;
  } | null;
  subscription_tiers: { price_cents: number; is_active: boolean }[];
}

const Discover = () => {
  const [query, setQuery] = useState("");
  const [niche, setNiche] = useState<NicheFilter>("All");

  const { data: coaches = [], isLoading } = useQuery({
    queryKey: ["discover-coaches"],
    queryFn: async (): Promise<(CoachCardData & { id: string; bio: string | null })[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, handle, display_name, headline, bio, avatar_url, coach_profiles!inner(niche, rating, subscriber_count, is_published), subscription_tiers(price_cents, is_active)",
        )
        .eq("coach_profiles.is_published", true);
      if (error) throw error;
      const rows = (data ?? []) as unknown as CoachRow[];
      return rows.map((r) => {
        const cp = r.coach_profiles!;
        const activePrices = (r.subscription_tiers ?? [])
          .filter((t) => t.is_active)
          .map((t) => t.price_cents);
        return {
          id: r.id,
          handle: r.handle,
          display_name: r.display_name,
          headline: r.headline,
          bio: r.bio,
          niche: cp.niche,
          rating: cp.rating,
          subscriber_count: cp.subscriber_count,
          starting_price_cents: activePrices.length > 0 ? Math.min(...activePrices) : null,
        };
      });
    },
  });

  const results = useMemo(
    () =>
      coaches.filter((c) => {
        const matchNiche = niche === "All" || c.niche === niche;
        const q = query.trim().toLowerCase();
        const matchQuery =
          !q ||
          c.display_name.toLowerCase().includes(q) ||
          (c.headline ?? "").toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q);
        return matchNiche && matchQuery;
      }),
    [query, niche, coaches],
  );

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
            {niches.map((n) => (
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

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="brutal-card-sm aspect-[4/5] animate-pulse bg-surface" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="brutal-card p-10 text-center">
            <p className="font-display text-xl">No coaches match.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try a different niche or keyword.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((c) => (
              <CoachCard key={c.id} coach={c} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Discover;
