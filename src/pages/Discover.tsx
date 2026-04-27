import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CoachCard } from "@/components/coach/CoachCard";
import { type Niche } from "@/lib/mock";
import { useCoaches } from "@/hooks/useCoaches";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn, formatIdr } from "@/lib/utils";

const niches: (Niche | "All")[] = ["All","Strength","Mindset","Endurance","Nutrition","Yoga","Business"];

type Sort = "rating" | "subscribers" | "price-asc" | "price-desc";

const sortLabels: Record<Sort, string> = {
  "rating": "Top rated",
  "subscribers": "Most subscribers",
  "price-asc": "Price: low → high",
  "price-desc": "Price: high → low",
};

const PRICE_MIN = 0;
const PRICE_MAX = 200;

const Discover = () => {
  const { coaches, loading } = useCoaches();
  const [query, setQuery] = useState("");
  const [niche, setNiche] = useState<(typeof niches)[number]>("All");
  const [sort, setSort] = useState<Sort>("rating");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);

  const results = useMemo(() => {
    return coaches
      .filter((c) => {
        const matchNiche = niche === "All" || c.niche === niche;
        const q = query.trim().toLowerCase();
        const matchQuery = !q || c.name.toLowerCase().includes(q) ||
          c.headline.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q);
        const startingPrice = Math.min(...c.tiers.map((t) => t.price));
        const matchPrice = startingPrice <= maxPrice;
        return matchNiche && matchQuery && matchPrice;
      })
      .sort((a, b) => {
        const aMin = Math.min(...a.tiers.map((t) => t.price));
        const bMin = Math.min(...b.tiers.map((t) => t.price));
        if (sort === "rating") return b.rating - a.rating;
        if (sort === "subscribers") return b.subscribers - a.subscribers;
        if (sort === "price-asc") return aMin - bMin;
        return bMin - aMin;
      });
  }, [coaches, query, niche, sort, maxPrice]);

  const filtersActive = niche !== "All" || maxPrice < PRICE_MAX || sort !== "rating";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-5xl">Discover coaches</h1>
          <p className="mt-2 text-muted-foreground">Verified coaches, ready when you are.</p>
        </header>

        <div className="brutal-card-sm sticky top-20 z-10 mb-8 flex flex-col gap-3 p-3 md:top-24">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="flex flex-1 items-center gap-2 border-2 border-ink bg-surface px-3 py-2">
              <Search className="h-4 w-4" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, niche, or keyword"
                className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none" />
            </label>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 border-2 border-ink px-3 py-2 text-xs font-semibold uppercase tracking-wide",
                showFilters || filtersActive ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
              {filtersActive && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent" />}
            </button>
          </div>

          <div className="flex gap-1 overflow-x-auto md:flex-wrap md:overflow-visible">
            {niches.map((n) => (
              <button key={n} onClick={() => setNiche(n)} className={cn(
                "shrink-0 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                niche === n ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
              )}>{n}</button>
            ))}
          </div>

          {showFilters && (
            <div className="grid gap-3 border-t-2 border-ink pt-3 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Sort by</label>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
                  className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none">
                  {(Object.keys(sortLabels) as Sort[]).map((s) => (
                    <option key={s} value={s}>{sortLabels[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Max starting price · {formatIdr(maxPrice)}
                </label>
                <input
                  type="range" min={PRICE_MIN} max={PRICE_MAX} step={5}
                  value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="mt-2 w-full accent-primary"
                />
              </div>
              {filtersActive && (
                <button
                  onClick={() => { setNiche("All"); setMaxPrice(PRICE_MAX); setSort("rating"); }}
                  className="inline-flex items-center justify-center gap-1 border-2 border-ink bg-destructive/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-destructive hover:bg-destructive/20 md:col-span-2"
                >
                  <X className="h-3.5 w-3.5" /> Reset filters
                </button>
              )}
            </div>
          )}
        </div>

        {loading && coaches.length === 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} aria-hidden className="brutal-card-sm overflow-hidden">
                <div className="aspect-[4/5] animate-pulse border-b-2 border-ink bg-surface" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-2/3 animate-pulse bg-surface" />
                  <div className="h-3 w-1/3 animate-pulse bg-surface" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="brutal-card p-10 text-center">
            <p className="font-display text-xl">No coaches match.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try a different niche, raise the price ceiling, or clear filters.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
              {results.length} coach{results.length === 1 ? "" : "es"} · sorted by {sortLabels[sort].toLowerCase()}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((c) => <CoachCard key={c.id} coach={c} />)}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Discover;
