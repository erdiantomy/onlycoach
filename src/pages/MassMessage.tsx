import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useQuery } from "@tanstack/react-query";

type Audience = "all" | string;

interface TierOption {
  id: string;
  name: string;
  menteeIds: string[];
}

interface Subscriber {
  mentee_id: string;
  tier_id: string;
  tier_name: string;
}

const MassMessage = () => {
  const { user } = useSession();
  const [audience, setAudience] = useState<Audience>("all");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: subscribers = [] } = useQuery<Subscriber[]>({
    queryKey: ["mass-message-subscribers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("mentee_id, tier_id, subscription_tiers(name)")
        .eq("coach_id", user!.id)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map((s) => {
        const t = s.subscription_tiers as unknown as { name: string } | null;
        return { mentee_id: s.mentee_id, tier_id: s.tier_id, tier_name: t?.name ?? "Unknown" };
      });
    },
  });

  const tiers = useMemo<TierOption[]>(() => {
    const map = new Map<string, TierOption>();
    for (const s of subscribers) {
      if (!map.has(s.tier_id)) {
        map.set(s.tier_id, { id: s.tier_id, name: s.tier_name, menteeIds: [] });
      }
      map.get(s.tier_id)!.menteeIds.push(s.mentee_id);
    }
    return Array.from(map.values());
  }, [subscribers]);

  const recipients = useMemo(() => {
    if (audience === "all") return subscribers.map((s) => s.mentee_id);
    return tiers.find((t) => t.id === audience)?.menteeIds ?? [];
  }, [audience, subscribers, tiers]);

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !body.trim()) return;
    if (recipients.length === 0) {
      toast.error("No recipients in that segment");
      return;
    }
    setSending(true);

    let sent = 0;
    let failed = 0;

    for (const menteeId of recipients) {
      try {
        // Upsert conversation
        const { data: conv, error: convErr } = await supabase
          .from("conversations")
          .upsert({ coach_id: user.id, mentee_id: menteeId, last_message_at: new Date().toISOString() },
            { onConflict: "coach_id,mentee_id" })
          .select("id")
          .single();

        if (convErr || !conv) { failed++; continue; }

        // Insert message
        const { error: msgErr } = await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: user.id,
          body: body.trim(),
        });

        if (msgErr) { failed++; } else { sent++; }
      } catch {
        failed++;
      }
    }

    setSending(false);
    if (failed > 0 && sent === 0) {
      toast.error("Broadcast failed — check your permissions");
    } else if (failed > 0) {
      toast.success(`Sent to ${sent} subscriber${sent === 1 ? "" : "s"} (${failed} failed)`);
    } else {
      toast.success(`Broadcast sent to ${sent} subscriber${sent === 1 ? "" : "s"}`);
    }
    setBody("");
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Studio
        </Link>

        <header className="mt-4 mb-6">
          <span className="brutal-tag mb-3"><MessageSquare className="h-3 w-3" /> Mass message</span>
          <h1 className="font-display text-3xl md:text-5xl">Reach everyone at once</h1>
          <p className="mt-2 text-muted-foreground">
            Send a one-off broadcast that appears as a DM to each subscriber.
          </p>
        </header>

        <form onSubmit={sendBroadcast} className="brutal-card p-5">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Audience</label>
            <div className="mt-2 flex flex-wrap gap-1">
              <SegmentButton active={audience === "all"} onClick={() => setAudience("all")}>
                All ({subscribers.length})
              </SegmentButton>
              {tiers.map((t) => (
                <SegmentButton key={t.id} active={audience === t.id} onClick={() => setAudience(t.id)}>
                  {t.name} ({t.menteeIds.length})
                </SegmentButton>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="What's the update?"
              className="mt-2 min-h-[120px] w-full resize-none border-2 border-ink bg-surface p-3 text-sm focus:outline-none" />
            <p className="mt-1 text-xs text-muted-foreground">
              Will send to {recipients.length} subscriber{recipients.length === 1 ? "" : "s"} as a DM.
            </p>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={!body.trim() || sending}
              className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
              <Send className="mr-1.5 h-4 w-4" />
              {sending ? `Sending…` : "Send broadcast"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};

const SegmentButton = ({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button type="button" onClick={onClick} className={cn(
    "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
    active ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
  )}>{children}</button>
);

export default MassMessage;
