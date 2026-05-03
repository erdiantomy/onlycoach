import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Gift, Share2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

const Referrals = () => {
  const { user } = useSession();
  const [copied, setCopied] = useState(false);
  const handle = user?.email?.split("@")[0] ?? "you";
  const link = `${typeof window !== "undefined" ? window.location.origin : "https://onlycoach.co"}/r/${handle}`;
  const totalEarned = 0;
  const referrals: { id: string; coachName: string; joinedAt: string; earnedCents: number }[] = [];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  const share = async () => {
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof navigator !== "undefined" && nav.share) {
      try {
        await nav.share({
          title: "Coach with me on OnlyCoach",
          text: "Join OnlyCoach and start earning from your subscribers.",
          url: link,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Studio
        </Link>

        <header className="mt-4 mb-8">
          <span className="brutal-tag mb-3"><Gift className="h-3 w-3" /> Referrals</span>
          <h1 className="font-display text-3xl md:text-5xl">Earn 10% from coaches you refer</h1>
          <p className="mt-2 text-muted-foreground">For 12 months, on every subscription their fans pay.</p>
        </header>

        <section className="brutal-card p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Your referral link</div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={link}
              className="flex-1 border-2 border-ink bg-surface px-3 py-2 font-mono text-xs focus:outline-none" />
            <div className="flex gap-2">
              <Button onClick={copy} variant="outline" className="border-2 border-ink bg-surface">
                <Copy className="mr-1.5 h-4 w-4" /> {copied ? "Copied" : "Copy"}
              </Button>
              <Button onClick={share} className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
                <Share2 className="mr-1.5 h-4 w-4" /> Share
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="brutal-card-sm p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Coaches referred</div>
            <div className="mt-2 font-display text-3xl">{referrals.length}</div>
          </div>
          <div className="brutal-card-sm p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Earned to date</div>
            <div className="mt-2 font-display text-2xl">{formatCurrency(totalEarned)}</div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Referrals</h2>
          <div className="brutal-card mt-4 p-10 text-center">
            <p className="font-display text-xl">No referrals yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Share your link to start earning.</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default Referrals;
