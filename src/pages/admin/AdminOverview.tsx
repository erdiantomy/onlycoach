import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";

interface LiveEvent {
  id: string;
  kind: "view" | "sub" | "post";
  label: string;
  at: string;
}

const AdminOverview = () => {
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);

  const { data: stats } = useQuery({
    queryKey: ["admin-overview-stats"],
    queryFn: async () => {
      const [profiles, coaches, subs, posts] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("coach_profiles").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
        supabase.from("posts").select("id", { count: "exact", head: true }),
      ]);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      const [newToday, new7d, new30d] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
      ]);

      const { data: mrrData } = await supabase
        .from("coach_daily_stats")
        .select("revenue_cents")
        .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

      const mrr = (mrrData ?? []).reduce((sum, r) => sum + (r.revenue_cents ?? 0), 0) / 100;

      return {
        totalUsers: profiles.count ?? 0,
        totalCoaches: coaches.count ?? 0,
        activeSubs: subs.count ?? 0,
        totalPosts: posts.count ?? 0,
        newToday: newToday.count ?? 0,
        new7d: new7d.count ?? 0,
        new30d: new30d.count ?? 0,
        mrr30d: mrr,
      };
    },
    refetchInterval: 30_000,
  });

  // Live feed via Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-live-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profile_views" }, (payload) => {
        const r = payload.new as { id: string; created_at: string };
        setLiveEvents((prev) => [
          { id: r.id, kind: "view", label: "Profile viewed", at: r.created_at },
          ...prev.slice(0, 49),
        ]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "subscriptions" }, (payload) => {
        const r = payload.new as { id: string; created_at: string };
        setLiveEvents((prev) => [
          { id: r.id, kind: "sub", label: "New subscription", at: r.created_at },
          ...prev.slice(0, 49),
        ]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, (payload) => {
        const r = payload.new as { id: string; created_at: string };
        setLiveEvents((prev) => [
          { id: r.id, kind: "post", label: "New community post", at: r.created_at },
          ...prev.slice(0, 49),
        ]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? "—" },
    { label: "Total Coaches", value: stats?.totalCoaches ?? "—" },
    { label: "Active Subscriptions", value: stats?.activeSubs ?? "—" },
    { label: "Total Posts", value: stats?.totalPosts ?? "—" },
    { label: "New Today", value: stats?.newToday ?? "—" },
    { label: "New (7d)", value: stats?.new7d ?? "—" },
    { label: "New (30d)", value: stats?.new30d ?? "—" },
    { label: "Revenue (30d)", value: stats ? `$${stats.mrr30d.toFixed(2)}` : "—" },
  ];

  const kindIcon = { view: "👁", sub: "⭐", post: "💬" };

  return (
    <AdminShell>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="brutal-card-sm p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-display text-3xl">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-xl">Live Activity Feed</h2>
        {liveEvents.length === 0 ? (
          <div className="brutal-card-sm p-6 text-center text-sm text-muted-foreground">
            Waiting for live events…
          </div>
        ) : (
          <div className="space-y-2">
            {liveEvents.map((e) => (
              <div key={e.id} className="brutal-card-sm flex items-center gap-3 p-3 text-sm">
                <span className="text-lg">{kindIcon[e.kind]}</span>
                <span className="flex-1">{e.label}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
};

export default AdminOverview;
