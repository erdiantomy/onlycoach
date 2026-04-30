import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DayStat {
  date: string;
  revenue: number;
  new_subs: number;
  new_users: number;
}

const AdminAnalytics = () => {
  const { data: stats = [], isLoading } = useQuery<DayStat[]>({
    queryKey: ["admin-platform-analytics"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const [dailyStats, dailySignups] = await Promise.all([
        supabase
          .from("coach_daily_stats")
          .select("date, revenue_cents, new_subscribers")
          .gte("date", thirtyDaysAgo)
          .order("date"),
        supabase
          .from("profiles")
          .select("created_at")
          .gte("created_at", thirtyDaysAgo + "T00:00:00Z"),
      ]);

      // Aggregate by date
      const revenueMap = new Map<string, number>();
      const subsMap = new Map<string, number>();
      for (const row of dailyStats.data ?? []) {
        const d = row.date.slice(0, 10);
        revenueMap.set(d, (revenueMap.get(d) ?? 0) + (row.revenue_cents ?? 0));
        subsMap.set(d, (subsMap.get(d) ?? 0) + (row.new_subscribers ?? 0));
      }

      const signupMap = new Map<string, number>();
      for (const row of dailySignups.data ?? []) {
        const d = row.created_at.slice(0, 10);
        signupMap.set(d, (signupMap.get(d) ?? 0) + 1);
      }

      // Build last 30 days array
      const result: DayStat[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        result.push({
          date: d,
          revenue: (revenueMap.get(d) ?? 0) / 100,
          new_subs: subsMap.get(d) ?? 0,
          new_users: signupMap.get(d) ?? 0,
        });
      }
      return result;
    },
  });

  const { data: topCoaches = [] } = useQuery({
    queryKey: ["admin-top-coaches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_profiles")
        .select("user_id, subscriber_count, profiles(display_name, handle)")
        .order("subscriber_count", { ascending: false })
        .limit(10);
      return (data ?? []).map((c) => {
        const p = c.profiles as unknown as { display_name: string; handle: string } | null;
        return {
          id: c.user_id,
          name: p?.display_name ?? "Unknown",
          handle: p?.handle ?? "",
          subscriber_count: c.subscriber_count ?? 0,
        };
      });
    },
  });

  const totalRevenue = stats.reduce((s, d) => s + d.revenue, 0);
  const totalNewSubs = stats.reduce((s, d) => s + d.new_subs, 0);
  const totalNewUsers = stats.reduce((s, d) => s + d.new_users, 0);

  return (
    <AdminShell>
      <h2 className="mb-4 font-display text-2xl">Platform Analytics (Last 30 days)</h2>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="brutal-card-sm p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</p>
          <p className="mt-1 font-display text-3xl">${totalRevenue.toFixed(0)}</p>
        </div>
        <div className="brutal-card-sm p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">New Subs</p>
          <p className="mt-1 font-display text-3xl">{totalNewSubs}</p>
        </div>
        <div className="brutal-card-sm p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">New Users</p>
          <p className="mt-1 font-display text-3xl">{totalNewUsers}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
      ) : (
        <>
          <div className="brutal-card-sm p-4 mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide">Daily Revenue ($)</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#1a1a1a" strokeWidth={2} fill="url(#adminRevGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="brutal-card-sm p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide">Daily Signups</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminSignupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} width={30} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="new_users" stroke="#2563eb" strokeWidth={2} fill="url(#adminSignupGrad)" name="New Users" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="mt-6">
        <h3 className="mb-3 font-display text-xl">Top 10 Coaches by Subscribers</h3>
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-ink-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Coach</th>
                <th className="px-3 py-2 text-left">Subscribers</th>
              </tr>
            </thead>
            <tbody>
              {topCoaches.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? "bg-surface" : "bg-background"}>
                  <td className="border-t border-ink/30 px-3 py-2 font-display text-lg">{i + 1}</td>
                  <td className="border-t border-ink/30 px-3 py-2">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">@{c.handle}</p>
                  </td>
                  <td className="border-t border-ink/30 px-3 py-2 font-semibold">{c.subscriber_count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

export default AdminAnalytics;
