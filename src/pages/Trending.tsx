import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { CoachCard } from "@/components/coach/CoachCard";
import { useCoaches } from "@/hooks/useCoaches";
import { challenges, posts as mockPosts, findCoach } from "@/lib/mock";
import { Flame, Trophy, Zap } from "lucide-react";
import { formatIdr } from "@/lib/utils";

const Trending = () => {
  const { coaches, loading } = useCoaches();

  const topCoaches = useMemo(
    () => [...coaches].sort((a, b) => b.subscribers - a.subscribers).slice(0, 6),
    [coaches],
  );
  const topPosts = useMemo(
    () => [...mockPosts].sort((a, b) => b.likes - a.likes).slice(0, 5),
    [],
  );
  const popularChallenges = useMemo(
    () => [...challenges].sort((a, b) => b.enrolled - a.enrolled).slice(0, 4),
    [],
  );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8">
          <span className="brutal-tag mb-3"><Flame className="h-3 w-3" /> Trending</span>
          <h1 className="font-display text-3xl md:text-5xl">What's hot this week</h1>
          <p className="mt-2 text-muted-foreground">
            Top coaches, popular cohorts, and the most-loved posts.
          </p>
        </header>

        <section>
          <h2 className="font-display text-2xl">
            <Zap aria-hidden className="mr-1 inline h-5 w-5 text-accent" /> Top coaches
          </h2>
          {loading && coaches.length === 0 ? (
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} aria-hidden className="brutal-card-sm aspect-[4/5] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {topCoaches.map((c) => <CoachCard key={c.id} coach={c} />)}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">
            <Trophy aria-hidden className="mr-1 inline h-5 w-5 text-primary" /> Popular cohorts
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popularChallenges.map((ch) => {
              const coach = findCoach(ch.coachId);
              const fillPct = Math.min(100, Math.round((ch.enrolled / ch.maxParticipants) * 100));
              return (
                <Link key={ch.id} to={`/challenges/${ch.id}`}
                  className="brutal-card-sm group flex flex-col p-4 hover:bg-accent/20">
                  <span className="brutal-tag self-start">{ch.status}</span>
                  <h3 className="mt-2 font-display text-lg group-hover:underline">{ch.title}</h3>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {coach?.name ?? "Coach"} · {ch.durationDays}d · {formatIdr(ch.price)}
                  </p>
                  <div className="mt-3 h-1.5 w-full border-2 border-ink bg-surface">
                    <div className="h-full bg-primary" style={{ width: `${fillPct}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {ch.enrolled}/{ch.maxParticipants} enrolled
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Most-liked posts</h2>
          <div className="mt-4 space-y-3">
            {topPosts.map((p) => {
              const coach = findCoach(p.coachId);
              return (
                <article key={p.id} className="brutal-card-sm flex items-start gap-4 p-4">
                  <div className="font-display text-3xl text-primary tabular-nums">
                    {p.likes}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {coach?.name ?? "Coach"} · {p.createdAt} ago · {p.requiredTier ? "Tier-locked" : "Free"}
                    </div>
                    <p className="mt-1">{p.body}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {p.likes} likes · {p.comments} comments
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default Trending;
