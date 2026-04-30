import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { ArrowLeft, Copy, Gift, Share2 } from "lucide-react";
import { toast } from "sonner";

function generateCode(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 10).toLowerCase();
}

const Referrals = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: referralCode } = useQuery({
    queryKey: ["referral-code", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("referral_codes")
        .select("id, code")
        .eq("coach_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const createCodeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const code = generateCode(user.id);
      const { data, error } = await supabase
        .from("referral_codes")
        .insert({ coach_id: user.id, code })
        .select("id, code")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral-code", user?.id] });
    },
    onError: () => toast.error("Could not create referral code"),
  });

  const { data: signups = [] } = useQuery({
    queryKey: ["referral-signups", referralCode?.id],
    enabled: !!referralCode?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("referral_signups")
        .select("id, created_at, converted_at, referred_user_id, profiles!referral_signups_referred_user_id_fkey(display_name, handle)")
        .eq("referral_code_id", referralCode!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const link = referralCode
    ? `https://onlycoach.co/r/${referralCode.code}`
    : "";

  const copy = async () => {
    if (!link) return;
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
    if (!link) return;
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

  const convertedCount = signups.filter((s) => s.converted_at !== null).length;

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
          {referralCode ? (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={link}
                className="flex-1 border-2 border-ink bg-surface px-3 py-2 font-mono text-xs focus:outline-none"
              />
              <div className="flex gap-2">
                <Button onClick={copy} variant="outline" className="border-2 border-ink bg-surface">
                  <Copy className="mr-1.5 h-4 w-4" /> {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  onClick={share}
                  className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90"
                >
                  <Share2 className="mr-1.5 h-4 w-4" /> Share
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => createCodeMutation.mutate()}
              disabled={createCodeMutation.isPending}
              className="mt-3 border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90"
            >
              {createCodeMutation.isPending ? "Creating…" : "Generate my referral link"}
            </Button>
          )}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="brutal-card-sm p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Coaches referred</div>
            <div className="mt-2 font-display text-3xl">{signups.length}</div>
          </div>
          <div className="brutal-card-sm p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Converted (subscribed)</div>
            <div className="mt-2 font-display text-3xl">{convertedCount}</div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Referrals</h2>
          {signups.length === 0 ? (
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
                    <th className="border-b-2 border-ink px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {signups.map((s) => {
                    const profile = s.profiles as unknown as { display_name: string; handle: string } | null;
                    return (
                      <tr key={s.id} className="border-b-2 border-ink/10 last:border-0">
                        <td className="px-4 py-3 font-semibold">
                          {profile?.display_name ?? "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`brutal-tag text-xs ${s.converted_at ? "bg-primary text-primary-foreground" : "bg-surface"}`}>
                            {s.converted_at ? "Converted" : "Signed up"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
