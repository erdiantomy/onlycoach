import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { coaches, dailyStats, posts as allPosts, subscribers } from "@/lib/mock";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Eye, Users } from "lucide-react";
import { cn, formatIdr } from "@/lib/utils";

type Range = "7d" | "30d" | "all";

const Analytics = () => {
  const me = coaches[0];
  const [range, setRange] = useState<Range>("30d");

  const window = useMemo(() => {
    if (range === "7d") return dailyStats.slice(-7);
    if (range === "all") return dailyStats;
    return dailyStats.slice(-30);
  }, [range]);

  const totals = useMemo(() => {
    return window.reduce((acc, d) => {
      acc.revenue += d.revenue;
      acc.newSubs += d.newSubs;
      acc.churned += d.churned;
      acc.views += d.views;
      return acc;
    }, { revenue: 0, newSubs: 0, churned: 0, views: 0 });
  }, [window]);

  const churnRate = totals.newSubs + me.subscribers > 0
    ? ((totals.churned / (totals.newSubs + me.subscribers)) * 100).toFixed(1)
    : "0.0";

  const peakRevenue = Math.max(...window.map((d) => d.revenue), 1);

  const myPosts = allPosts.filter((p) => p.coachId === me.id);
  const topPosts = [...myPosts].sort((a, b) => b.likes - a.likes).slice(0, 5);

  const tierBreakdown = me.tiers.map((t, i) => {
    const sliceSubs = subscribers.filter((s) => s.tier === t.name).length || (me.subscribers / me.tiers.length);
    const revenue = sliceSubs * t.price;
    const pct = (sliceSubs / Math.max(me.subscribers, 1)) * 100;
    return { ...t, sliceSubs, revenue, pct, idx: i };
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Studio
        </Link>

        <header className="mt-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="brutal-tag mb-3">Analytics</span>
            <h1 className="font-display text-3xl md:text-5xl">Performance</h1>
          </div>
          <div className="flex gap-1">
            {(["7d", "30d", "all"] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={cn(
                "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                range === r ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
              )}>{r}</button>
            ))}
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Revenue" value={formatIdr(totals.revenue)} icon={DollarSign} />
          <StatCard label="New subscribers" value={totals.newSubs.toLocaleString()} icon={TrendingUp} />
          <StatCard label="Churn rate" value={`${churnRate}%`} icon={TrendingDown} />
          <StatCard label="Content views" value={totals.views.toLocaleString()} icon={Eye} />
        </section>

        <section className="mt-8 brutal-card-sm p-5">
          <h2 className="font-display text-xl">Revenue trend</h2>
          <div className="mt-5 flex h-40 items-end gap-1">
            {window.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end" title={`${d.date}: ${formatIdr(d.revenue)}`}>
                <div
                  className="w-full border-2 border-ink bg-primary"
                  style={{ height: `${Math.max(4, (d.revenue / peakRevenue) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>{window[0]?.date}</span>
            <span>{window[window.length - 1]?.date}</span>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="brutal-card-sm p-5">
            <h2 className="font-display text-xl">Revenue by tier</h2>
            <div className="mt-4 space-y-3">
              {tierBreakdown.map((t) => (
                <div key={t.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-muted-foreground">{formatIdr(t.revenue)} · {Math.round(t.sliceSubs)} subs</span>
                  </div>
                  <div className="mt-1 h-2 w-full border-2 border-ink bg-surface">
                    <div
                      className={cn("h-full", t.idx === 0 ? "bg-primary" : t.idx === 1 ? "bg-accent" : "bg-secondary")}
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="brutal-card-sm p-5">
            <h2 className="font-display text-xl">Top posts</h2>
            <div className="mt-3 space-y-2">
              {topPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No posts yet — publish your first to see traction.</p>
              ) : topPosts.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 border-b-2 border-ink/10 pb-2 last:border-0">
                  <p className="line-clamp-2 text-sm">{p.body}</p>
                  <div className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                    <div>{p.likes} likes</div>
                    <div>{p.comments} comments</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 brutal-card-sm p-5">
          <h2 className="font-display text-xl flex items-center gap-2"><Users className="h-5 w-5" /> Engagement</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">DAU / MAU</div>
              <div className="font-display text-2xl">38%</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg session</div>
              <div className="font-display text-2xl">6m 12s</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">DM response rate</div>
              <div className="font-display text-2xl">94%</div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

const StatCard = ({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) => (
  <div className="brutal-card-sm p-4">
    <Icon className="h-5 w-5 text-primary" />
    <div className="mt-3 font-display text-2xl">{value}</div>
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
);

export default Analytics;
