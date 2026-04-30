import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Eye } from "lucide-react";
import { cn, formatIdr } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Range = "7d" | "30d" | "all";

interface DailyStat {
  stat_date: string;
  revenue_cents: number;
  new_subscribers: number;
  churned_subscribers: number;
  content_views: number;
}

interface PostRow {
  id: string;
  body: string;
  like_count: number;
  comment_count: number;
}

interface TierBreakdown {
  id: string;
  name: string;
  price_cents: number;
  sub_count: number;
  revenue: number;
  pct: number;
}

const Analytics = () => {
  const { user } = useSession();
  const [range, setRange] = useState<Range>("30d");

  const cutoff = () => {
    const d = new Date();
    if (range === "7d") d.setDate(d.getDate() - 7);
    else if (range === "30d") d.setDate(d.getDate() - 30);
    else d.setFullYear(d.getFullYear() - 5);
    return d.toISOString().slice(0, 10);
  };

  const { data: stats = [] } = useQuery<DailyStat[]>({
    queryKey: ["analytics-stats", user?.id, range],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_daily_stats")
        .select("stat_date, revenue_cents, new_subscribers, churned_subscribers, content_views")
        .eq("coach_id", user!.id)
        .gte("stat_date", cutoff())
        .order("stat_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: topPosts = [] } = useQuery<PostRow[]>({
    queryKey: ["analytics-posts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, body, like_count, comment_count")
        .eq("coach_id", user!.id)
        .order("like_count", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tiers = [] } = useQuery<TierBreakdown[]>({
    queryKey: ["analytics-tiers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: tierData } = await supabase
        .from("subscription_tiers")
        .select("id, name, price_cents")
        .eq("coach_id", user!.id)
        .eq("is_active", true);

      const tierList = tierData ?? [];
      if (!tierList.length) return [];

      const counts = await Promise.all(
        tierList.map(async (t) => {
          const { count } = await supabase
            .from("subscriptions")
            .select("id", { count: "exact", head: true })
            .eq("tier_id", t.id)
            .eq("status", "active");
          return { ...t, sub_count: count ?? 0 };
        }),
      );
      const totalSubs = counts.reduce((s, t) => s + t.sub_count, 0);
      return counts.map((t) => ({
        id: t.id,
        name: t.name,
        price_cents: t.price_cents,
        sub_count: t.sub_count,
        revenue: t.sub_count * t.price_cents,
        pct: totalSubs > 0 ? (t.sub_count / totalSubs) * 100 : 0,
      }));
    },
  });

  const totals = stats.reduce(
    (acc, d) => ({
      revenueCents: acc.revenueCents + d.revenue_cents,
      newSubs: acc.newSubs + d.new_subscribers,
      churned: acc.churned + d.churned_subscribers,
      views: acc.views + d.content_views,
    }),
    { revenueCents: 0, newSubs: 0, churned: 0, views: 0 },
  );

  const churnRate =
    totals.newSubs + totals.churned > 0
      ? ((totals.churned / (totals.newSubs + totals.churned)) * 100).toFixed(1)
      : "0.0";

  const chartData = stats.map((d) => ({
    date: d.stat_date.slice(5),
    revenueCents: d.revenue_cents,
    newSubs: d.new_subscribers,
    views: d.content_views,
  }));

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
          <StatCard label="Revenue" value={formatIdr(totals.revenueCents)} icon={DollarSign} />
          <StatCard label="New subscribers" value={totals.newSubs.toLocaleString()} icon={TrendingUp} />
          <StatCard label="Churn rate" value={`${churnRate}%`} icon={TrendingDown} />
          <StatCard label="Content views" value={totals.views.toLocaleString()} icon={Eye} />
        </section>

        <section className="mt-8 brutal-card-sm p-5">
          <h2 className="font-display text-xl">Revenue trend</h2>
          {chartData.length === 0 ? (
            <div className="mt-6 flex h-40 items-center justify-center text-sm text-muted-foreground">
              No data yet for this period
            </div>
          ) : (
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatIdr(v)} />
                  <Tooltip
                    formatter={(value: number) => [formatIdr(value), "Revenue"]}
                    contentStyle={{ border: "2px solid hsl(var(--ink))", borderRadius: 0, background: "hsl(var(--surface))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenueCents"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="brutal-card-sm p-5">
            <h2 className="font-display text-xl">Revenue by tier</h2>
            {tiers.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No active tiers — create one in Settings.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {tiers.map((t, idx) => (
                  <div key={t.id}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold">{t.name}</span>
                      <span className="text-muted-foreground">{formatIdr(t.revenue)} · {t.sub_count} subs</span>
                    </div>
                    <div className="mt-1 h-2 w-full border-2 border-ink bg-surface">
                      <div
                        className={cn("h-full", idx === 0 ? "bg-primary" : idx === 1 ? "bg-accent" : "bg-secondary")}
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="brutal-card-sm p-5">
            <h2 className="font-display text-xl">Top posts</h2>
            <div className="mt-3 space-y-2">
              {topPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No posts yet — publish your first to see traction.</p>
              ) : topPosts.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 border-b-2 border-ink/10 pb-2 last:border-0">
                  <p className="line-clamp-2 text-sm">{p.body}</p>
                  <div className="text-right text-xs uppercase tracking-wide text-muted-foreground shrink-0">
                    <div>{p.like_count} likes</div>
                    <div>{p.comment_count} comments</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

const StatCard = ({ label, value, icon: Icon }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <div className="brutal-card-sm p-4">
    <Icon className="h-5 w-5 text-primary" />
    <div className="mt-3 font-display text-2xl">{value}</div>
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
);

export default Analytics;
