import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { coaches, posts } from "@/lib/mock";
import { CreditCard, LogOut, Settings, Sparkles } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatPerMonth } from "@/lib/currency";

const Me = () => {
  const { user, loading, signOut } = useSession();
  usePageTitle("Profile");
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string; handle: string } | null>(null);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, handle").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setProfile(data));
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role","coach").maybeSingle()
      .then(({ data }) => setIsCoach(!!data));
  }, [user]);

  const subscribed = coaches.slice(0, 2);
  const unread = posts.length;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <header className="brutal-card flex items-center gap-4 p-5">
          <div className="h-16 w-16 shrink-0 border-2 border-ink bg-accent" />
          <div className="flex-1">
            <h1 className="font-display text-2xl">{profile?.display_name ?? "You"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email ?? ""}{profile?.handle ? ` · @${profile.handle}` : ""}</p>
          </div>
          <Button asChild variant="outline" className="border-2 border-ink bg-surface">
            <Link to="/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
          </Button>
        </header>

        <section className="mt-6">
          <h2 className="font-display text-xl">Your subscriptions</h2>
          <div className="mt-3 space-y-3">
            {subscribed.map((c) => (
              <Link key={c.id} to={`/coach/${c.handle}`}
                className="brutal-card-sm flex items-center gap-4 p-4 hover:-translate-x-0.5 hover:-translate-y-0.5">
                <div className="h-12 w-12 border-2 border-ink bg-primary" />
                <div className="flex-1">
                  <div className="font-display">{c.name}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {c.tiers[1]?.name ?? c.tiers[0].name} · {formatPerMonth(c.tiers[1]?.price ?? c.tiers[0].price)}
                  </div>
                </div>
                <span className="brutal-tag bg-accent">Active</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link to={isCoach ? "/studio" : "/onboarding"} className="brutal-card-sm flex items-center gap-3 p-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <div className="font-display">{isCoach ? "Coach studio" : "Become a coach"}</div>
              <div className="text-xs text-muted-foreground">
                {isCoach ? `Manage your studio · ${unread} drafts ready` : "Open your studio"}
              </div>
            </div>
          </Link>
          <Link to="/settings" className="brutal-card-sm flex items-center gap-3 p-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <div className="font-display">Payment methods</div>
              <div className="text-xs text-muted-foreground">Manage card &amp; billing</div>
            </div>
          </Link>
        </section>

        <button onClick={() => signOut().then(() => navigate("/"))}
          className="mt-10 inline-flex items-center gap-2 border-2 border-ink bg-surface px-4 py-2 text-sm font-semibold uppercase tracking-wide">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </AppShell>
  );
};

export default Me;
