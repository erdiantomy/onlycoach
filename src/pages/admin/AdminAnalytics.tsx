import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminShell from "./AdminShell";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DailyStat {
  stat_date: string;
  revenue_cents: number;
  new_subscribers: number;
}
interface TopCoach {
  user_id: string;
  subscriber_count: number;
  display_name: string;
  handle: string;
}

export default function AdminAnalytics() {
  const { data: stats = [] } = useQuery<DailyStat[]>({
    queryKey: ["admin-analytics-stats"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const { data } = await supabase.from("coach_daily_stats").select("stat_date, revenue_cents, new_subscribers").gte("stat_date", since).order("stat_date");
      return (data ?? []) as DailyStat[];
    },
  });

  const { data: signups = [] } = useQuery<{ day: string; count: number }[]>({
    queryKey: ["admin-analytics-signups"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase.from("profiles").select("created_at").gte("created_at", since).limit(5000);
      const map = new Map<string, number>();
      (data ?? []).forEach((p: { created_at: string }) => {
        const d = p.created_at.slice(0, 10);
        map.set(d, (map.get(d) ?? 0) + 1);
      });
      return Array.from(map.entries()).sort().map(([day, count]) => ({ day, count }));
    },
  });

  const { data: topCoaches = [] } = useQuery<TopCoach[]>({
    queryKey: ["admin-analytics-top"],
    queryFn: async () => {
      const { data: cps } = await supabase.from("coach_profiles").select("user_id, subscriber_count").order("subscriber_count", { ascending: false }).limit(10);
      const ids = (cps ?? []).map((c) => c.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, display_name, handle").in("id", ids);
      const pm = new Map((profs ?? []).map((p) => [p.id, p]));
      return (cps ?? []).map((c) => ({ ...c, ...(pm.get(c.user_id) ?? { display_name: "—", handle: "—" }) })) as TopCoach[];
    },
  });

  const totals = useMemo(() => {
    const rev = stats.reduce((s, d) => s + d.revenue_cents, 0);
    const subs = stats.reduce((s, d) => s + d.new_subscribers, 0);
    const users = signups.reduce((s, d) => s + d.count, 0);
    return { rev, subs, users };
  }, [stats, signups]);

  const revenueData = stats.map((d) => ({ date: d.stat_date.slice(5), revenue: +(d.revenue_cents / 100).toFixed(2) }));
  const signupData = signups.map((d) => ({ date: d.day.slice(5), users: d.count }));

  return (
    <AdminShell title="Analytics" subtitle="Last 30 days">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="brutal-card-sm p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</div>
          <div className="mt-2 font-display text-2xl">${(totals.rev / 100).toFixed(2)}</div>
        </div>
        <div className="brutal-card-sm p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">New subs</div>
          <div className="mt-2 font-display text-2xl">{totals.subs}</div>
        </div>
        <div className="brutal-card-sm p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">New users</div>
          <div className="mt-2 font-display text-2xl">{totals.users}</div>
        </div>
      </section>

      <section className="brutal-card mt-6 p-4">
        <h2 className="mb-3 font-display text-lg">Daily revenue</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="brutal-card mt-6 p-4">
        <h2 className="mb-3 font-display text-lg">Daily signups</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={signupData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.3)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="brutal-card mt-6 p-4">
        <h2 className="mb-3 font-display text-lg">Top 10 coaches by subscribers</h2>
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-ink-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Coach</th>
                <th className="px-3 py-2 text-left">Subscribers</th>
              </tr>
            </thead>
            <tbody>
              {topCoaches.map((c, i) => (
                <tr key={c.user_id} className={`border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"}`}>
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2">
                    {c.display_name} <span className="text-xs text-muted-foreground">@{c.handle}</span>
                  </td>
                  <td className="px-3 py-2 font-display text-base">{c.subscriber_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
