import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Check, Lock, MessageCircle, Star, Users, Calendar, Trophy } from "lucide-react";
import NotFound from "./NotFound";
import { useSession } from "@/hooks/useSession";
import { startSubscriptionCheckout, changeSubscription, cancelSubscription, OfflineError, isCheckoutBlockedOnDevice } from "@/lib/checkout";
import { formatIdr } from "@/lib/utils";
import { ManageOnWebNotice } from "@/components/ManageOnWebNotice";
import { OfflineBoundary } from "@/components/OfflineBoundary";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ShareProfileButton } from "@/components/ShareProfileButton";
import { EditProfileModal } from "@/components/EditProfileModal";

type Tab = "about" | "posts" | "challenges";

interface CoachData {
  id: string;
  display_name: string;
  handle: string;
  bio: string | null;
  headline: string | null;
  avatar_url: string | null;
  follower_count: number;
  niche: string;
  rating: number;
  subscriber_count: number;
}

interface Tier {
  id: string;
  name: string;
  price_cents: number;
  perks: string[];
  sort_order: number;
}

interface Post {
  id: string;
  body: string;
  created_at: string;
  media_type: string;
  required_tier_id: string | null;
  like_count: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  duration_days: number;
  status: string;
}

interface ActiveSub {
  tier_id: string;
  status: string;
  cancel_at_period_end?: boolean | null;
  current_period_end?: string | null;
}

const CoachProfile = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const [tab, setTab] = useState<Tab>("about");
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: coach, isLoading, error } = useQuery<CoachData | null>({
    queryKey: ["coach-profile", handle],
    enabled: !!handle,
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from("profiles")
        .select("id, display_name, handle, bio, headline, avatar_url, follower_count, coach_profiles!inner(niche, rating, subscriber_count, is_published)")
        .eq("handle", handle!)
        .maybeSingle();
      if (qErr || !data) return null;
      const cp = data.coach_profiles as unknown as { niche: string; rating: number; subscriber_count: number; is_published: boolean } | null;
      if (!cp?.is_published) return null;
      return {
        id: data.id,
        display_name: data.display_name,
        handle: data.handle,
        bio: data.bio,
        headline: data.headline,
        avatar_url: data.avatar_url,
        follower_count: (data as { follower_count?: number }).follower_count ?? 0,
        niche: cp.niche,
        rating: cp.rating,
        subscriber_count: cp.subscriber_count,
      };
    },
  });

  const { data: tiers = [] } = useQuery<Tier[]>({
    queryKey: ["coach-tiers", coach?.id],
    enabled: !!coach?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_tiers")
        .select("id, name, price_cents, perks, sort_order")
        .eq("coach_id", coach!.id)
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["coach-posts-public", coach?.id],
    enabled: !!coach?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, body, created_at, media_type, required_tier_id, like_count")
        .eq("coach_id", coach!.id)
        .order("created_at", { ascending: false })
        .limit(9);
      return data ?? [];
    },
  });

  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ["coach-challenges-public", coach?.id],
    enabled: !!coach?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("challenges")
        .select("id, title, description, price_cents, duration_days, status")
        .eq("coach_id", coach!.id)
        .in("status", ["open", "active"])
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: activeSub, refetch: refetchSub } = useQuery<ActiveSub | null>({
    queryKey: ["viewer-sub", user?.id, coach?.id],
    enabled: !!user && !!coach?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("tier_id, status, cancel_at_period_end, current_period_end")
        .eq("mentee_id", user!.id)
        .eq("coach_id", coach!.id)
        .maybeSingle();
      return (data as ActiveSub | null) ?? null;
    },
  });

  useEffect(() => {
    if (coach) {
      document.title = `${coach.display_name} — ${coach.headline ?? coach.niche} | OnlyCoach`;
    }
    return () => { document.title = "OnlyCoach"; };
  }, [coach]);

  useEffect(() => {
    if (!coach) return;
    supabase.from("profile_views").insert({
      profile_id: coach.id,
      viewer_id: user?.id ?? null,
      referrer: document.referrer || null,
    }).then(() => {});
  }, [coach?.id, user?.id]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="animate-pulse">
          <div className="h-56 bg-primary border-b-2 border-ink" />
          <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
            <div className="h-8 w-64 border-2 border-ink bg-surface" />
            <div className="h-4 w-48 border-2 border-ink bg-surface" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!coach || error) return <NotFound />;

  const isOwner = user?.id === coach.id;
  const isSubscribed = activeSub && ["active", "trialing"].includes(activeSub.status);
  const tierColors = ["bg-primary text-primary-foreground", "bg-accent", "bg-surface"];

  const subscribe = async (tierId: string) => {
    if (!user) { navigate(`/auth?mode=signup&from=/coach/${coach.handle}`); return; }
    setBusy(true);
    try {
      if (isSubscribed && activeSub!.tier_id !== tierId) {
        await changeSubscription(tierId);
        toast.success("Plan changed — proration applied");
        refetchSub();
      } else {
        await startSubscriptionCheckout(tierId);
      }
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e instanceof OfflineError ? e.message : (e?.message ?? "Could not start checkout"));
    } finally { setBusy(false); }
  };

  const handleCancel = async () => {
    if (!user || !activeSub) return;
    if (!confirm("Cancel at end of billing period? You keep access until then.")) return;
    setBusy(true);
    try {
      await cancelSubscription(coach.id);
      toast.success("Subscription will end at period end");
      refetchSub();
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e instanceof OfflineError ? e.message : (e?.message ?? "Could not cancel"));
    } finally { setBusy(false); }
  };

  return (
    <AppShell>
      {/* Cover header */}
      <div className="border-b-2 border-ink bg-primary">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-4 py-10 md:flex-row md:items-end md:px-8 md:py-16">
          <div className="h-28 w-28 shrink-0 border-2 border-ink bg-accent overflow-hidden md:h-40 md:w-40">
            {coach.avatar_url && (
              <img src={coach.avatar_url} alt={coach.display_name} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex-1 text-primary-foreground">
            <span className="brutal-tag bg-surface text-foreground">{coach.niche}</span>
            <h1 className="mt-3 font-display text-4xl md:text-6xl">{coach.display_name}</h1>
            <p className="mt-1 text-sm opacity-80">@{coach.handle}</p>
            {coach.headline && (
              <p className="mt-2 text-sm uppercase tracking-wide opacity-90">{coach.headline}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-current text-accent" /> {coach.rating.toFixed(1)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" /> {coach.subscriber_count.toLocaleString()} subscribers
              </span>
              <span className="inline-flex items-center gap-1 opacity-80">
                <Users className="h-4 w-4" /> {coach.follower_count.toLocaleString()} followers
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <button onClick={() => setEditOpen(true)} className="brutal-tag cursor-pointer select-none">
                Edit profile
              </button>
            )}
            <ShareProfileButton
              name={coach.display_name}
              headline={coach.headline ?? undefined}
              handle={coach.handle}
              role="coach"
            />
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="sticky top-16 z-10 border-b-2 border-ink bg-background md:top-0">
        <div className="mx-auto flex w-full max-w-5xl px-4 md:px-8">
          {(["about", "posts", "challenges"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "border-r-2 border-ink px-5 py-3 text-xs font-semibold uppercase tracking-wide last:border-r-0",
                tab === t ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/40",
              )}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1fr_360px] md:px-8 md:py-14">
        {/* Main content */}
        <div className="space-y-10 min-w-0">
          {tab === "about" && (
            <section>
              <h2 className="font-display text-2xl">About</h2>
              <p className="mt-3 whitespace-pre-wrap">
                {coach.bio || "This coach hasn't written a bio yet."}
              </p>
            </section>
          )}

          {tab === "posts" && (
            <section>
              <h2 className="font-display text-2xl">Posts</h2>
              {posts.length === 0 ? (
                <div className="brutal-card-sm mt-4 p-8 text-center">
                  <p className="font-display text-xl">No posts yet.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {posts.map((p) => {
                    const isLocked = !!p.required_tier_id && !isSubscribed;
                    return (
                      <article key={p.id} className="brutal-card-sm p-4">
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                          <span>{new Date(p.created_at).toLocaleDateString()}</span>
                          {isLocked && (
                            <span className="inline-flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Subscriber only
                            </span>
                          )}
                        </div>
                        {isLocked ? (
                          <div className="relative mt-2 select-none">
                            <p className="blur-sm text-sm pointer-events-none">{p.body}</p>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="brutal-tag bg-surface">Subscribe to read</span>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm">{p.body}</p>
                        )}
                        <div className="mt-3 text-xs text-muted-foreground">{p.like_count} likes</div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {tab === "challenges" && (
            <section>
              <h2 className="font-display text-2xl">Challenges</h2>
              {challenges.length === 0 ? (
                <div className="brutal-card-sm mt-4 p-8 text-center">
                  <p className="font-display text-xl">No active challenges.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {challenges.map((ch) => (
                    <Link key={ch.id} to={`/challenges/${ch.id}`} className="block">
                      <article className="brutal-card-sm p-4 hover:bg-accent/20">
                        <div className="flex items-center justify-between">
                          <span className="brutal-tag">{ch.status}</span>
                          <span className="font-display text-lg">{formatIdr(ch.price_cents / 100)}</span>
                        </div>
                        <h3 className="mt-2 font-display text-xl">{ch.title}</h3>
                        {ch.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{ch.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> {ch.duration_days}d
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Trophy className="h-3.5 w-3.5" /> Enroll →
                          </span>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Subscription sidebar */}
        <aside className="md:sticky md:top-24 md:self-start">
          <OfflineBoundary
            blockWhenOffline
            title="Checkout unavailable offline"
            description="Subscriptions need a stable connection. Reconnect and tap retry."
          >
            <div className="brutal-card p-5">
              <h3 className="font-display text-xl">{isSubscribed ? "Your plan" : "Subscribe"}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeSub?.cancel_at_period_end
                  ? `Ends ${activeSub.current_period_end ? new Date(activeSub.current_period_end).toLocaleDateString() : "soon"}`
                  : "Cancel anytime. Upgrades prorate instantly."}
              </p>

              {tiers.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No subscription tiers yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {tiers.map((t, i) => {
                    const isCurrent = isSubscribed && activeSub!.tier_id === t.id;
                    return (
                      <div key={t.id} className={cn("border-2 border-ink p-4", isCurrent ? "bg-primary text-primary-foreground" : tierColors[i] ?? "bg-surface")}>
                        <div className="flex items-baseline justify-between">
                          <span className="font-display text-lg">{t.name}</span>
                          <span className="font-display text-lg">
                            {formatIdr(t.price_cents / 100)}<span className="text-xs">/mo</span>
                          </span>
                        </div>
                        {t.perks.length > 0 && (
                          <ul className="mt-2 space-y-1 text-sm">
                            {t.perks.map((perk) => (
                              <li key={perk} className="flex items-start gap-2">
                                <Check className="mt-0.5 h-4 w-4 shrink-0" />{perk}
                              </li>
                            ))}
                          </ul>
                        )}
                        {!isCheckoutBlockedOnDevice() && (
                          <Button
                            onClick={() => subscribe(t.id)}
                            disabled={busy || isCurrent}
                            className="mt-3 w-full border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90"
                          >
                            {isCurrent ? "Current plan" : isSubscribed ? "Switch to this" : "Subscribe"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isCheckoutBlockedOnDevice() && (
                <ManageOnWebNotice
                  className="mt-4"
                  path={`/coach/${coach.handle}`}
                  title="Subscribe on web"
                  description="Per App Store policy, subscriptions are completed on our website."
                  ctaLabel="Subscribe on web"
                />
              )}
              {isSubscribed && !activeSub?.cancel_at_period_end && !isCheckoutBlockedOnDevice() && (
                <Button
                  onClick={handleCancel}
                  disabled={busy}
                  variant="outline"
                  className="mt-3 w-full border-2 border-ink bg-surface text-destructive"
                >
                  Cancel subscription
                </Button>
              )}
              {user && !isOwner && (
                <Button asChild variant="outline" className="mt-3 w-full border-2 border-ink bg-surface">
                  <Link to="/messages">
                    <MessageCircle className="mr-2 h-4 w-4" /> Message coach
                  </Link>
                </Button>
              )}
            </div>
          </OfflineBoundary>
        </aside>
      </div>

      {isOwner && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          role="coach"
          initial={{
            display_name: coach.display_name,
            handle: coach.handle,
            bio: coach.bio,
            headline: coach.headline,
            avatar_url: coach.avatar_url,
          }}
        />
      )}
    </AppShell>
  );
};

export default CoachProfile;
