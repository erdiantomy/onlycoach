import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminShell from "./AdminShell";
import { Activity, FileText, Users, UserCheck, CreditCard, TrendingUp, Calendar, DollarSign } from "lucide-react";

interface FeedItem {
  id: string;
  kind: "view" | "subscription" | "community";
  label: string;
  ts: string;
}

const StatCard = ({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string | number }) => (
  <div className="brutal-card-sm p-4">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="mt-2 font-display text-2xl">{value}</div>
  </div>
);

export default function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-overview-stats"],
    queryFn: async () => {
      const now = new Date();
      const day = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
      const [users, coaches, subs, posts, today, d7, d30, revenue] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("coach_profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", day(1)),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", day(7)),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", day(30)),
        supabase.from("coach_daily_stats").select("revenue_cents").gte("stat_date", day(30).slice(0, 10)),
      ]);
      const rev = (revenue.data ?? []).reduce((s, r: { revenue_cents: number }) => s + (r.revenue_cents ?? 0), 0);
      return {
        users: users.count ?? 0,
        coaches: coaches.count ?? 0,
        subs: subs.count ?? 0,
        posts: posts.count ?? 0,
        today: today.count ?? 0,
        d7: d7.count ?? 0,
        d30: d30.count ?? 0,
        revenue: rev,
      };
    },
  });

  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    const ch = supabase
      .channel("admin-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profile_views" }, () => {
        const item: FeedItem = { id: crypto.randomUUID(), kind: "view", label: "Profile viewed", ts: new Date().toISOString() };
        setFeed((f) => [item, ...f].slice(0, 50));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "subscriptions" }, () => {
        const item: FeedItem = { id: crypto.randomUUID(), kind: "subscription", label: "New subscription", ts: new Date().toISOString() };
        setFeed((f) => [item, ...f].slice(0, 50));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, () => {
        const item: FeedItem = { id: crypto.randomUUID(), kind: "community", label: "New community post", ts: new Date().toISOString() };
        setFeed((f) => [item, ...f].slice(0, 50));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <AdminShell title="Overview" subtitle="Live snapshot of the platform">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={stats?.users ?? "—"} />
        <StatCard icon={UserCheck} label="Total coaches" value={stats?.coaches ?? "—"} />
        <StatCard icon={CreditCard} label="Active subs" value={stats?.subs ?? "—"} />
        <StatCard icon={FileText} label="Total posts" value={stats?.posts ?? "—"} />
        <StatCard icon={Calendar} label="New today" value={stats?.today ?? "—"} />
        <StatCard icon={TrendingUp} label="New 7d" value={stats?.d7 ?? "—"} />
        <StatCard icon={TrendingUp} label="New 30d" value={stats?.d30 ?? "—"} />
        <StatCard icon={DollarSign} label="Revenue 30d" value={`$${((stats?.revenue ?? 0) / 100).toFixed(0)}`} />
      </section>

      <section className="brutal-card mt-6 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg">
          <Activity className="h-4 w-4" /> Live activity
        </h2>
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Waiting for events…</p>
        ) : (
          <ul className="divide-y-2 divide-ink/20">
            {feed.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2">
                  {f.kind === "view" && <Users className="h-3.5 w-3.5" />}
                  {f.kind === "subscription" && <CreditCard className="h-3.5 w-3.5" />}
                  {f.kind === "community" && <FileText className="h-3.5 w-3.5" />}
                  {f.label}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(f.ts).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
