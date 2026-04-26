import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { coaches, subscribers } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Audience = "all" | string; // "all" or a tier name

const MassMessage = () => {
  const me = coaches[0];
  const [audience, setAudience] = useState<Audience>("all");
  const [body, setBody] = useState("");
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [welcomeBody, setWelcomeBody] = useState(
    "Welcome aboard. Reply here any time — I read every message.",
  );

  const recipientCount = useMemo(() => {
    if (audience === "all") return subscribers.length;
    return subscribers.filter((s) => s.tier === audience).length;
  }, [audience]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    if (recipientCount === 0) {
      toast.error("No recipients in that segment");
      return;
    }
    toast.success(`Message queued for ${recipientCount} subscriber${recipientCount === 1 ? "" : "s"}`);
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
            Send a one-off broadcast or set up a welcome message for new subscribers.
          </p>
        </header>

        <form onSubmit={send} className="brutal-card p-5">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Audience</label>
            <div className="mt-2 flex flex-wrap gap-1">
              <SegmentButton active={audience === "all"} onClick={() => setAudience("all")}>
                All ({subscribers.length})
              </SegmentButton>
              {me.tiers.map((t) => {
                const count = subscribers.filter((s) => s.tier === t.name).length;
                return (
                  <SegmentButton key={t.id} active={audience === t.name} onClick={() => setAudience(t.name)}>
                    {t.name} ({count})
                  </SegmentButton>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="What's the update?"
              className="mt-2 min-h-[120px] w-full resize-none border-2 border-ink bg-surface p-3 text-sm focus:outline-none" />
            <p className="mt-1 text-xs text-muted-foreground">
              Will deliver to {recipientCount} subscriber{recipientCount === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={!body.trim()}
              className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
              <Send className="mr-1.5 h-4 w-4" /> Send broadcast
            </Button>
          </div>
        </form>

        <section className="brutal-card-sm mt-6 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Welcome message</h2>
            <button
              onClick={() => setWelcomeEnabled((v) => !v)}
              className={cn(
                "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                welcomeEnabled ? "bg-primary text-primary-foreground" : "bg-surface",
              )}
            >
              {welcomeEnabled ? "On" : "Off"}
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-sent the moment a new subscriber joins.
          </p>
          <textarea value={welcomeBody} onChange={(e) => setWelcomeBody(e.target.value)}
            disabled={!welcomeEnabled}
            className="mt-3 min-h-[80px] w-full resize-none border-2 border-ink bg-surface p-3 text-sm focus:outline-none disabled:opacity-50" />
          <div className="mt-3 flex justify-end">
            <Button onClick={() => toast.success("Welcome message saved")} disabled={!welcomeEnabled}
              className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
              Save
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

const SegmentButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} className={cn(
    "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
    active ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
  )}>{children}</button>
);

export default MassMessage;
