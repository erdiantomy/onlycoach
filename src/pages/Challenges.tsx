import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { challenges, findCoach, type Challenge } from "@/lib/mock";
import { Calendar, Users, Search, Trophy } from "lucide-react";
import { cn, formatIdr } from "@/lib/utils";

const filters: Array<"All" | Challenge["status"]> = ["All", "open", "active", "completed"];

const Challenges = () => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const results = useMemo(() => challenges.filter((c) => {
    const matchStatus = filter === "All" || c.status === filter;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  }), [query, filter]);

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

        {results.length === 0 ? (
          <div className="brutal-card p-10 text-center">
            <p className="font-display text-xl">No challenges match.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try another filter or check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((ch) => {
              const coach = findCoach(ch.coachId);
              const fillPct = Math.min(100, Math.round((ch.enrolled / ch.maxParticipants) * 100));
              return (
                <Link key={ch.id} to={`/challenges/${ch.id}`} className="brutal-card-sm group flex flex-col p-5 hover:bg-accent/20">
                  <div className="flex items-center justify-between">
                    <span className="brutal-tag">{ch.status}</span>
                    <span className="font-display text-lg">{formatIdr(ch.price)}</span>
                  </div>
                  <h2 className="mt-3 font-display text-xl group-hover:underline">{ch.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">by {coach?.name ?? "Coach"}</p>
                  <p className="mt-3 line-clamp-3 text-sm">{ch.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-wide text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {ch.durationDays}d</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {ch.enrolled}/{ch.maxParticipants}</span>
                    <span>{ch.startsIn}</span>
                  </div>
                  <div className="mt-3 h-1.5 w-full border-2 border-ink bg-surface">
                    <div className="h-full bg-primary" style={{ width: `${fillPct}%` }} />
                  </div>
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
