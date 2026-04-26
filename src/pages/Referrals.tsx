import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { coaches, referrals } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Gift, Share2 } from "lucide-react";
import { toast } from "sonner";
import { formatIdr } from "@/lib/utils";

const Referrals = () => {
  const me = coaches[0];
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== "undefined" ? window.location.origin : "https://onlycoach.app"}/r/${me.handle}`;
  const totalEarned = referrals.reduce((s, r) => s + r.earnedToDate, 0);

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
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: "Coach with me on OnlyCoach",
          text: "Join OnlyCoach and start earning from your subscribers.",
          url: link,
        });
      } catch {
        // user cancelled
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
              <Button onClick={copy} variant="outline"
                className="border-2 border-ink bg-surface">
                <Copy className="mr-1.5 h-4 w-4" /> {copied ? "Copied" : "Copy"}
              </Button>
              <Button onClick={share}
                className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
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
            <div className="mt-2 font-display text-2xl">{formatIdr(totalEarned)}</div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Referrals</h2>
          {referrals.length === 0 ? (
            <div className="brutal-card mt-4 p-10 text-center">
              <p className="font-display text-xl">No referrals yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Share your link to start earning.</p>
            </div>
          ) : (
            <div className="brutal-card mt-4 overflow-x-auto">
              <table className="w-full min-w-[360px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="border-b-2 border-ink px-4 py-3">Coach</th>
                    <th className="border-b-2 border-ink px-4 py-3">Joined</th>
                    <th className="border-b-2 border-ink px-4 py-3">Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-b-2 border-ink/10 last:border-0">
                      <td className="px-4 py-3 font-semibold">{r.coachName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.joinedAt}</td>
                      <td className="px-4 py-3 font-semibold">{formatIdr(r.earnedToDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export default Referrals;
