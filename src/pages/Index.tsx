import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, MessageCircle, PlayCircle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatIdr } from "@/lib/utils";

interface FeaturedCoach {
  user_id: string;
  niche: string;
  rating: number;
  lowestPriceCents: number | null;
  profiles: {
    handle: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

const Index = () => {
  const { data: featuredCoaches = [] } = useQuery<FeaturedCoach[]>({
    queryKey: ["featured-coaches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_profiles")
        .select("user_id, niche, rating, profiles(handle, display_name, avatar_url)")
        .eq("is_published", true)
        .order("subscriber_count", { ascending: false })
        .limit(4);

      const rawCoaches = data ?? [];
      const coachIds = rawCoaches.map((c) => c.user_id);
      const tierMap: Map<string, number> = new Map();

      if (coachIds.length > 0) {
        const { data: tierData } = await supabase
          .from("subscription_tiers")
          .select("coach_id, price_cents")
          .in("coach_id", coachIds)
          .eq("is_active", true);

        for (const t of tierData ?? []) {
          const existing = tierMap.get(t.coach_id);
          if (existing === undefined || t.price_cents < existing) {
            tierMap.set(t.coach_id, t.price_cents);
          }
        }
      }

      return rawCoaches.map((c) => ({
        user_id: c.user_id,
        niche: c.niche,
        rating: c.rating,
        lowestPriceCents: tierMap.get(c.user_id) ?? null,
        profiles: c.profiles as unknown as FeaturedCoach["profiles"],
      }));
    },
  });

  return (
    <AppShell hideTabBar>
      {/* HERO */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:py-20">
          <div>
            <span className="brutal-tag mb-6">
              <Sparkles className="h-3 w-3" /> Peer-to-peer coaching
            </span>
            <h1 className="font-display text-5xl leading-[0.95] md:text-7xl">
              The <span className="text-primary">only</span> place
              <br />
              you'll need
              <br />
              your <span className="text-primary">coach</span>.
            </h1>
            <p className="mt-6 max-w-lg text-base text-muted-foreground md:text-lg">
              Subscribe to a coach, unlock their content, message them directly,
              and book live 1:1 sessions — all in one place. No middlemen.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="border-2 border-ink bg-accent text-ink shadow-brutal hover:bg-accent/90"
              >
                <Link to="/auth?mode=signup">
                  Start as a mentee <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-ink bg-surface text-foreground shadow-brutal-sm hover:bg-surface/80"
              >
                <Link to="/auth?mode=signup&role=coach">I'm a coach</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground">
              {["Cancel anytime", "Verified coaches", "Secure payments"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero card mockup */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="brutal-card relative p-5">
              <div className="flex items-center justify-between">
                <Logo variant="inline" className="h-6 sm:h-7" />
                <span className="brutal-tag">PRO TIER</span>
              </div>
              <div className="mt-5 aspect-[4/5] border-2 border-ink bg-primary/90">
                <div className="flex h-full items-end justify-between p-4 text-primary-foreground">
                  <div>
                    <div className="font-display text-2xl leading-none">YOUR COACH</div>
                    <div className="mt-1 text-xs uppercase tracking-wide opacity-80">
                      Strength · Hypertrophy
                    </div>
                  </div>
                  <PlayCircle className="h-10 w-10" strokeWidth={1.5} />
                </div>
              </div>
              <button className="mt-4 w-full border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide text-ink shadow-brutal-sm">
                Subscribe — from Rp149.000/mo
              </button>
              <button className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-ink bg-surface py-3 font-display text-sm uppercase tracking-wide text-ink">
                <MessageCircle className="h-4 w-4" /> Message coach
              </button>
            </div>
            <div
              aria-hidden
              className="absolute -bottom-4 -right-4 -z-10 h-full w-full border-2 border-ink bg-primary"
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b-2 border-ink bg-surface">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
          <h2 className="font-display text-3xl md:text-5xl">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Find your coach", d: "Browse verified coaches by niche, price, and reviews." },
              { n: "02", t: "Subscribe", d: "Pick a tier to unlock their feed, DMs, and bookings." },
              { n: "03", t: "Show up", d: "Consume content, chat anytime, and book live 1:1 sessions." },
            ].map((step) => (
              <div key={step.n} className="brutal-card p-6">
                <div className="font-display text-4xl text-primary">{step.n}</div>
                <h3 className="mt-3 font-display text-xl">{step.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED COACHES */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl md:text-5xl">Featured coaches</h2>
            <Link
              to="/discover"
              className="hidden text-sm font-semibold uppercase tracking-wide underline-offset-4 hover:underline md:inline"
            >
              See all →
            </Link>
          </div>

          {featuredCoaches.length === 0 ? (
            <div className="mt-8 brutal-card p-10 text-center">
              <p className="font-display text-xl">Coaches coming soon.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Want to be featured?{" "}
                <Link to="/auth?mode=signup&role=coach" className="underline">
                  Apply to coach →
                </Link>
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCoaches.map((c) => {
                const profile = c.profiles;
                if (!profile) return null;
                const initials = profile.display_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                return (
                  <article key={c.user_id} className="brutal-card-sm overflow-hidden">
                    <div className="aspect-[4/5] border-b-2 border-ink bg-primary/90 overflow-hidden">
                      <Avatar className="h-full w-full rounded-none">
                        <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} className="object-cover" />
                        <AvatarFallback className="rounded-none bg-primary text-primary-foreground font-display text-4xl">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-base">{profile.display_name}</h3>
                        <span className="text-xs font-semibold">★ {c.rating.toFixed(1)}</span>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{c.niche}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-display text-sm">
                          {c.lowestPriceCents !== null
                            ? <>{formatIdr(c.lowestPriceCents)}<span className="text-xs">/mo</span></>
                            : <span className="text-xs text-muted-foreground">Free</span>
                          }
                        </span>
                        <Link
                          to={`/coach/${profile.handle}`}
                          className="border-2 border-ink bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-brutal-sm"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-8">
          <h2 className="font-display text-3xl leading-tight md:text-5xl">
            Your coach,<br className="md:hidden" /> in your pocket.
          </h2>
          <Button
            asChild
            size="lg"
            className="border-2 border-ink bg-accent text-ink shadow-brutal hover:bg-accent/90"
          >
            <Link to="/auth?mode=signup">
              Create your account <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t-2 border-ink bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm md:flex-row md:items-center md:px-8">
          <Logo variant="inline" className="h-7 md:h-8" />
          <p className="text-muted-foreground">© {new Date().getFullYear()} ONLY/COACH. All rights reserved.</p>
        </div>
      </footer>
    </AppShell>
  );
};

export default Index;
