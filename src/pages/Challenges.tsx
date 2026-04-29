import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Calendar, Users, Search, Trophy } from "lucide-react";
import { cn, formatIdr } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type ChallengeStatus = Database["public"]["Enums"]["challenge_status"];
const filters: Array<"All" | ChallengeStatus> = ["All", "open", "active", "completed"];

interface ChallengeItem {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  duration_days: number;
  max_participants: number | null;
  starts_at: string | null;
  status: ChallengeStatus;
  coach_name: string | null;
  coach_handle: string | null;
  enrollment_count: number;
}

const Challenges = () => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const { data: all = [], isLoading } = useQuery<ChallengeItem[]>({
    queryKey: ["challenges-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, description, price_cents, duration_days, max_participants, starts_at, status, profiles!challenges_coach_id_fkey(display_name, handle)")
        .in("status", ["open", "active", "completed"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((row) => {
        const p = row.profiles as unknown as { display_name: string | null; handle: string | null } | null;
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          price_cents: row.price_cents,
          duration_days: row.duration_days,
          max_participants: row.max_participants,
          starts_at: row.starts_at,
          status: row.status as ChallengeStatus,
          coach_name: p?.display_name ?? null,
          coach_handle: p?.handle ?? null,
          enrollment_count: 0,
        };
      });
    },
  });

  const results = all.filter((c) => {
    const matchStatus = filter === "All" || c.status === filter;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8">
          <span className="brutal-tag mb-3"><Trophy className="h-3 w-3" /> Challenges</span>
          <h1 className="font-display text-3xl md:text-5xl">Time-boxed cohorts</h1>
          <p className="mt-2 text-muted-foreground">Pick a challenge, train alongside others, finish stronger.</p>
        </header>

        <div className="brutal-card-sm sticky top-20 z-10 mb-8 flex flex-col gap-3 p-3 md:top-24 md:flex-row md:items-center">
          <label className="flex flex-1 items-center gap-2 border-2 border-ink bg-surface px-3 py-2">
            <Search className="h-4 w-4" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search challenges"
              className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none" />
          </label>
          <div className="flex gap-1 overflow-x-auto md:flex-wrap md:overflow-visible">
            {filters.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn(
                "shrink-0 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                filter === f ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
              )}>{f}</button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="brutal-card-sm animate-pulse p-5 space-y-3">
                <div className="h-4 w-20 bg-surface border-2 border-ink" />
                <div className="h-6 w-full bg-surface border-2 border-ink" />
                <div className="h-16 w-full bg-surface border-2 border-ink" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="brutal-card p-10 text-center">
            <p className="font-display text-xl">No challenges match.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try another filter or check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((ch) => {
              const maxP = ch.max_participants ?? 0;
              const fillPct = maxP > 0 ? Math.min(100, Math.round((ch.enrollment_count / maxP) * 100)) : 0;
              const startsIn = ch.starts_at ? new Date(ch.starts_at).toLocaleDateString() : "Open";
              return (
                <Link key={ch.id} to={`/challenges/${ch.id}`} className="brutal-card-sm group flex flex-col p-5 hover:bg-accent/20">
                  <div className="flex items-center justify-between">
                    <span className="brutal-tag">{ch.status}</span>
                    <span className="font-display text-lg">{formatIdr(ch.price_cents / 100)}</span>
                  </div>
                  <h2 className="mt-3 font-display text-xl group-hover:underline">{ch.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">by {ch.coach_name ?? "Coach"}</p>
                  <p className="mt-3 line-clamp-3 text-sm">{ch.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-wide text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {ch.duration_days}d</span>
                    {ch.max_participants && (
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {ch.enrollment_count}/{ch.max_participants}</span>
                    )}
                    <span>{startsIn}</span>
                  </div>
                  {ch.max_participants && (
                    <div className="mt-3 h-1.5 w-full border-2 border-ink bg-surface">
                      <div className="h-full bg-primary" style={{ width: `${fillPct}%` }} />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Challenges;
