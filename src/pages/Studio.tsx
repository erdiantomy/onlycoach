import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { posts, coaches } from "@/lib/mock";
import { DollarSign, Plus, Users, FileText, MessageCircle, BarChart3, Banknote, Gift, Trophy, Sparkles } from "lucide-react";
import { formatIdr } from "@/lib/utils";

const Studio = () => {
  const me = coaches[0];
  const myPosts = posts.filter((p) => p.coachId === me.id);
  const mrr = me.subscribers * 0.4 * 25;

  const stats = [
    { label: "Subscribers", value: me.subscribers.toLocaleString(), icon: Users },
    { label: "Monthly revenue", value: formatIdr(Math.round(mrr)), icon: DollarSign },
    { label: "Posts", value: myPosts.length, icon: FileText },
    { label: "Unread DMs", value: 7, icon: MessageCircle },
  ];

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="brutal-tag mb-3">Coach studio</span>
            <h1 className="font-display text-3xl md:text-5xl">Welcome back, {me.name.split(" ")[0]}.</h1>
          </div>
          <Link to="/studio/post/new"
            className="inline-flex items-center gap-2 border-2 border-ink bg-accent px-4 py-2.5 text-sm font-semibold uppercase tracking-wide shadow-brutal-sm">
            <Plus className="h-4 w-4" /> New post
          </Link>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="brutal-card-sm p-4">
              <s.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-display text-2xl">{s.value}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Manage</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { to: "/studio/analytics", label: "Analytics", icon: BarChart3 },
              { to: "/studio/subscribers", label: "Subscribers", icon: Users },
              { to: "/studio/content", label: "Content", icon: FileText },
              { to: "/studio/tiers", label: "Tiers", icon: Sparkles },
              { to: "/studio/payouts", label: "Payouts", icon: Banknote },
              { to: "/studio/referrals", label: "Referrals", icon: Gift },
              { to: "/studio/challenges", label: "Challenges", icon: Trophy },
              { to: "/studio/broadcast", label: "Broadcast", icon: MessageCircle },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="brutal-card-sm flex items-center gap-3 p-4 hover:bg-accent/30">
                <Icon className="h-5 w-5 text-primary" />
                <span className="font-display text-lg">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Your posts</h2>
          <div className="mt-4 space-y-3">
            {myPosts.map((p) => (
              <article key={p.id} className="brutal-card-sm flex items-start gap-4 p-4">
                <div className="h-16 w-16 shrink-0 border-2 border-ink bg-primary" />
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {p.createdAt} ago · {p.requiredTier ? `Tier-locked` : "Free"}
                  </div>
                  <p className="mt-1">{p.body}</p>
                  <div className="mt-2 text-xs text-muted-foreground">{p.likes} likes · {p.comments} comments</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default Studio;
