import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { findCoach, posts as allPosts } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { Check, Lock, MessageCircle, Star, Users } from "lucide-react";
import NotFound from "./NotFound";
import { useSession } from "@/hooks/useSession";
import { startSubscriptionCheckout, changeSubscription, cancelSubscription, OfflineError } from "@/lib/checkout";
import { formatIdr } from "@/lib/utils";
import { isCheckoutBlockedOnDevice } from "@/lib/checkout";
import { ManageOnWebNotice } from "@/components/ManageOnWebNotice";
import { OfflineBoundary } from "@/components/OfflineBoundary";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ActiveSub {
  tier_id: string;
  status: string;
  cancel_at_period_end?: boolean | null;
  current_period_end?: string | null;
}

const CoachProfile = () => {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const coach = handle ? findCoach(handle) : undefined;
  const [activeSub, setActiveSub] = useState<ActiveSub | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !coach) return;
    // The mock data uses local IDs; in production CoachProfile would query by real DB id.
    // We attempt a lookup by display name -> coach_id for the demo.
    (async () => {
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("handle", coach.handle).maybeSingle();
      if (!profile) return;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("tier_id, status, cancel_at_period_end, current_period_end")
        .eq("mentee_id", user.id)
        .eq("coach_id", profile.id)
        .maybeSingle();
      if (sub) setActiveSub(sub as ActiveSub);
    })();
  }, [user, coach]);

  if (!coach) return <NotFound />;
  const samplePosts = allPosts.filter((p) => p.coachId === coach.id).slice(0, 3);
  const isSubscribed = activeSub && ["active", "trialing"].includes(activeSub.status);

  const subscribe = async (tierId: string) => {
    if (!user) {
      navigate(`/auth?mode=signup&from=/coach/${coach.handle}`);
      return;
    }
    setBusy(true);
    try {
      if (isSubscribed && activeSub!.tier_id !== tierId) {
        await changeSubscription(tierId);
        toast.success("Plan changed — proration applied");
        setActiveSub({ ...activeSub!, tier_id: tierId });
      } else {
        await startSubscriptionCheckout(tierId);
      }
    } catch (err: any) {
      if (err instanceof OfflineError) {
        toast.error(err.message);
      } else {
        toast.error(err?.message ?? "Could not start checkout");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!user || !activeSub) return;
    if (!confirm("Cancel at the end of your billing period? You'll keep access until then.")) return;
    setBusy(true);
    try {
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("handle", coach.handle).maybeSingle();
      if (!profile) throw new Error("Coach not found");
      const result = await cancelSubscription(profile.id);
      setActiveSub({ ...activeSub, cancel_at_period_end: true, current_period_end: result.access_until });
      toast.success("Subscription will end at the period end");
    } catch (err: any) {
      if (err instanceof OfflineError) {
        toast.error(err.message);
      } else {
        toast.error(err?.message ?? "Could not cancel");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="border-b-2 border-ink bg-primary">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-4 py-10 md:flex-row md:items-end md:px-8 md:py-16">
          <div className="aspect-square w-28 shrink-0 border-2 border-ink bg-accent md:w-40" />
          <div className="text-primary-foreground">
            <span className="brutal-tag bg-surface text-foreground">{coach.niche}</span>
            <h1 className="mt-3 font-display text-4xl md:text-6xl">{coach.name}</h1>
            <p className="mt-2 text-sm uppercase tracking-wide opacity-90">{coach.headline}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-current text-accent" /> {coach.rating}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {coach.subscribers.toLocaleString()} subscribers</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1fr_360px] md:px-8 md:py-14">
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-2xl">About</h2>
            <p className="mt-3 text-foreground">{coach.bio}</p>
          </section>

          <section>
            <h2 className="font-display text-2xl">Recent posts</h2>
            <div className="mt-4 space-y-4">
              {samplePosts.map((p) => (
                <article key={p.id} className="brutal-card-sm p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <span>{p.createdAt} ago</span>
                    {p.requiredTier && <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Subscriber only</span>}
                  </div>
                  <p className="mt-2">{p.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <OfflineBoundary
            blockWhenOffline
            title="Checkout unavailable offline"
            description="Subscriptions and bookings need a stable connection. Reconnect and tap retry to continue."
          >
          <div className="brutal-card p-5">
            <h3 className="font-display text-xl">{isSubscribed ? "Your plan" : "Subscribe"}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeSub?.cancel_at_period_end
                ? `Ends ${activeSub.current_period_end ? new Date(activeSub.current_period_end).toLocaleDateString() : "soon"}`
                : "Cancel anytime. Upgrades prorate instantly."}
            </p>
            <div className="mt-4 space-y-3">
              {coach.tiers.map((t, i) => {
                const isCurrent = isSubscribed && activeSub!.tier_id === t.id;
                return (
                  <div key={t.id} className={`border-2 border-ink p-4 ${isCurrent ? "bg-primary text-primary-foreground" : i === 1 ? "bg-accent" : "bg-surface"}`}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-lg">{t.name}</span>
                      <span className="font-display text-lg">{formatIdr(t.price)}<span className="text-xs">/mo</span></span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {t.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0" />{perk}
                        </li>
                      ))}
                    </ul>
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
            {isCheckoutBlockedOnDevice() && (
              <ManageOnWebNotice
                className="mt-4"
                path={`/c/${coach.handle}`}
                title="Subscribe on web"
                description="Per App Store policy, subscriptions are completed on our website. You'll be redirected to your browser."
                ctaLabel="Subscribe on web"
              />
            )}
            {isSubscribed && !activeSub?.cancel_at_period_end && !isCheckoutBlockedOnDevice() && (
              <Button onClick={handleCancel} disabled={busy} variant="outline"
                className="mt-3 w-full border-2 border-ink bg-surface text-destructive">
                Cancel subscription
              </Button>
            )}
            <Button asChild variant="outline" className="mt-3 w-full border-2 border-ink bg-surface">
              <Link to="/messages"><MessageCircle className="mr-2 h-4 w-4" /> Message coach</Link>
            </Button>
          </div>
          </OfflineBoundary>
        </aside>
      </div>
    </AppShell>
  );
};

export default CoachProfile;
