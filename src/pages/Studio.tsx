import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Plus, Users, FileText, MessageCircle, BarChart3, Banknote, Gift, Trophy, X } from "lucide-react";
import { formatIdr } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const Studio = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [showTierForm, setShowTierForm] = useState(false);
  const [tierName, setTierName] = useState("");
  const [tierPriceIdr, setTierPriceIdr] = useState("");
  const [tierPerks, setTierPerks] = useState("");

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

  const { data: tiers = [] } = useQuery({
    queryKey: ["my-tiers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await supabase
        .from("subscription_tiers")
        .select("id, name, price_cents, perks, sort_order")
        .eq("coach_id", user!.id)
        .eq("is_active", true)
        .order("sort_order");
      return res.data ?? [];
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

  const createTierMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const priceNum = Math.round(parseFloat(tierPriceIdr));
      if (isNaN(priceNum) || priceNum <= 0) throw new Error("Enter a valid price in IDR");
      const perksArr = tierPerks
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      const { error } = await supabase.from("subscription_tiers").insert({
        coach_id: user.id,
        name: tierName.trim(),
        price_cents: priceNum * 100,
        perks: perksArr,
        sort_order: tiers.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tiers", user?.id] });
      setShowTierForm(false);
      setTierName("");
      setTierPriceIdr("");
      setTierPerks("");
      toast.success("Tier created!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCreateTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierName.trim()) { toast.error("Tier name is required"); return; }
    createTierMutation.mutate();
  };

  const firstName = (data?.displayName ?? "").split(" ")[0] || "Coach";

  const stats = [
    { label: "Subscribers", value: (data?.subscriberCount ?? 0).toLocaleString(), icon: Users },
    { label: "Monthly revenue", value: formatIdr(data?.mrrCents ?? 0), icon: DollarSign },
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

        {/* Tier creation prompt — critical for new coaches */}
        {tiers.length === 0 && (
          <section className="mt-8 brutal-card border-l-4 border-l-primary p-5">
            <h2 className="font-display text-xl">Create your first subscription tier</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Without tiers, nobody can subscribe to you. Set up at least one tier to start earning.
            </p>

            {!showTierForm ? (
              <Button
                onClick={() => setShowTierForm(true)}
                className="mt-4 border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90"
              >
                <Plus className="mr-2 h-4 w-4" /> Create a tier
              </Button>
            ) : (
              <form onSubmit={handleCreateTier} className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide">New tier</span>
                  <button type="button" onClick={() => setShowTierForm(false)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  placeholder="Tier name (e.g. Basic, Pro, VIP)"
                  className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                  required
                />
                <input
                  value={tierPriceIdr}
                  onChange={(e) => setTierPriceIdr(e.target.value)}
                  placeholder="Price in IDR (e.g. 149000)"
                  inputMode="numeric"
                  className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                  required
                />
                <textarea
                  value={tierPerks}
                  onChange={(e) => setTierPerks(e.target.value)}
                  placeholder="Perks, one per line (e.g. Weekly post&#10;Community access)"
                  rows={3}
                  className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createTierMutation.isPending}
                    className="border-2 border-ink bg-accent shadow-brutal-sm"
                  >
                    {createTierMutation.isPending ? "Saving…" : "Save tier"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowTierForm(false)}
                    className="border-2 border-ink bg-surface">
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </section>
        )}

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
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { to: "/studio/analytics", label: "Analytics", icon: BarChart3 },
              { to: "/studio/subscribers", label: "Subscribers", icon: Users },
              { to: "/studio/payouts", label: "Payouts", icon: Banknote },
              { to: "/studio/referrals", label: "Referrals", icon: Gift },
              { to: "/studio/challenges", label: "Challenges", icon: Trophy },
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
