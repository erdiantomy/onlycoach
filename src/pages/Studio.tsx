import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Plus, Users, FileText, MessageCircle, BarChart3, Banknote, Tag, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

const Studio = () => {
  const { user } = useSession();

  const { data } = useQuery({
    queryKey: ["studio", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [profileRes, coachRes, postsRes, subsRes, mrrRes] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, handle")
            .eq("id", user!.id)
            .maybeSingle(),
          supabase
            .from("coach_profiles")
            .select("subscriber_count")
            .eq("user_id", user!.id)
            .maybeSingle(),
          supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("coach_id", user!.id),
          supabase
            .from("subscriptions")
            .select("id", { count: "exact", head: true })
            .eq("coach_id", user!.id)
            .eq("status", "active"),
          supabase
            .from("subscriptions")
            .select("tier_id, subscription_tiers(price_cents)")
            .eq("coach_id", user!.id)
            .eq("status", "active"),
        ]);

      const mrrCents = (mrrRes.data ?? []).reduce((sum, row) => {
        const tier = row.subscription_tiers as { price_cents: number } | null;
        return sum + (tier?.price_cents ?? 0);
      }, 0);

      return {
        displayName: profileRes.data?.display_name ?? "Coach",
        subscriberCount: coachRes.data?.subscriber_count ?? subsRes.count ?? 0,
        postCount: postsRes.count ?? 0,
        mrrCents,
      };
    },
  });

  const { data: recentPosts = [] } = useQuery({
    queryKey: ["studio-posts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await supabase
        .from("posts")
        .select("id, body, created_at, like_count, comment_count, required_tier_id, media_type")
        .eq("coach_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return res.data ?? [];
    },
  });

  const firstName = (data?.displayName ?? "").split(" ")[0] || "Coach";

  const formatMrr = (cents: number) => formatCurrency(cents);

  const stats = [
    { label: "Subscribers", value: (data?.subscriberCount ?? 0).toLocaleString(), icon: Users },
    { label: "Monthly revenue", value: formatMrr(data?.mrrCents ?? 0), icon: DollarSign },
    { label: "Posts", value: data?.postCount ?? 0, icon: FileText },
    { label: "Unread DMs", value: "—", icon: MessageCircle },
  ];

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="brutal-tag mb-3">Coach studio</span>
            <h1 className="font-display text-3xl md:text-5xl">
              Welcome back, {firstName}.
            </h1>
          </div>
          <Link
            to="/studio/post/new"
            className="inline-flex items-center gap-2 border-2 border-ink bg-accent px-4 py-2.5 text-sm font-semibold uppercase tracking-wide shadow-brutal-sm"
          >
            <Plus className="h-4 w-4" /> New post
          </Link>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="brutal-card-sm p-4">
              <s.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-display text-2xl">{s.value}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Manage</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/studio/tiers", label: "Tiers", icon: Tag },
              { to: "/studio/availability", label: "Availability", icon: Calendar },
              { to: "/studio/analytics", label: "Analytics", icon: BarChart3 },
              { to: "/studio/subscribers", label: "Subscribers", icon: Users },
              { to: "/studio/payouts", label: "Payouts", icon: Banknote },
              { to: "/studio/broadcast", label: "Broadcast", icon: MessageCircle },
            ].map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="brutal-card-sm flex items-center gap-3 p-4 hover:bg-accent/30"
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="font-display text-lg">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Your posts</h2>
          {recentPosts.length === 0 ? (
            <div className="brutal-card mt-4 p-8 text-center text-muted-foreground">
              No posts yet.{" "}
              <Link to="/studio/post/new" className="underline">
                Create your first post
              </Link>
              .
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {recentPosts.map((p) => (
                <article
                  key={p.id}
                  className="brutal-card-sm flex items-start gap-4 p-4"
                >
                  <div className="h-16 w-16 shrink-0 border-2 border-ink bg-primary" />
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()} ·{" "}
                      {p.required_tier_id ? "Tier-locked" : "Free"}
                    </div>
                    <p className="mt-1">{p.body}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {p.like_count} likes · {p.comment_count} comments
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export default Studio;
