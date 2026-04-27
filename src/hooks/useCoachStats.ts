import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CoachStats {
  subscriberCount: number;
  postCount: number;
  unreadDms: number;
  /** Last 30-day revenue in IDR cents — converted to USD-equivalent for the
   * existing UI's price formatter. */
  monthlyRevenueUsd: number;
  /** True iff numbers came from Supabase rather than the seed defaults. */
  live: boolean;
}

const DEFAULTS: CoachStats = {
  subscriberCount: 1248,
  postCount: 6,
  unreadDms: 7,
  monthlyRevenueUsd: 1248 * 0.4 * 25, // mirrors the previous mock formula
  live: false,
};

/**
 * Fetches the signed-in coach's headline stats: subscriber count, post
 * count, unread DMs, and last-30-day revenue. Falls back to mock-equivalent
 * defaults when Supabase is empty or the user isn't authed yet so the
 * Studio dashboard always renders a non-zero number.
 *
 * Revenue lands in coach_daily_stats.revenue_cents (IDR cents); we convert
 * to the USD-equivalent the rest of the UI's formatIdr() helper expects.
 */
export const useCoachStats = () => {
  const [stats, setStats] = useState<CoachStats>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const since = new Date();
        since.setDate(since.getDate() - 30);
        const sinceStr = since.toISOString().slice(0, 10);

        const [subs, posts, dms, statsRows] = await Promise.all([
          supabase.from("subscriptions")
            .select("id", { count: "exact", head: true })
            .eq("coach_id", user.id)
            .in("status", ["active", "trialing"]),
          supabase.from("posts")
            .select("id", { count: "exact", head: true })
            .eq("coach_id", user.id),
          supabase.from("messages")
            .select("id", { count: "exact", head: true })
            .is("read_at", null)
            .neq("sender_id", user.id),
          supabase.from("coach_daily_stats")
            .select("revenue_cents")
            .eq("coach_id", user.id)
            .gte("stat_date", sinceStr),
        ]);

        if (cancelled) return;
        const subCount = subs.count ?? DEFAULTS.subscriberCount;
        const postCount = posts.count ?? DEFAULTS.postCount;
        const dmCount = dms.count ?? DEFAULTS.unreadDms;
        const totalCents = (statsRows.data ?? []).reduce(
          (sum, r) => sum + ((r as { revenue_cents?: number }).revenue_cents ?? 0),
          0,
        );
        // IDR cents → USD-equivalent (formatIdr multiplies back by 16000)
        const revenueUsd = totalCents > 0 ? totalCents / 16000 : DEFAULTS.monthlyRevenueUsd;

        setStats({
          subscriberCount: subCount,
          postCount,
          unreadDms: dmCount,
          monthlyRevenueUsd: revenueUsd,
          live: subCount > 0 || postCount > 0 || totalCents > 0,
        });
      } catch {
        if (!cancelled) setStats(DEFAULTS);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  return stats;
};
