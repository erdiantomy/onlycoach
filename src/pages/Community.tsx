import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { coaches, findCoach, type CommunityPost } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { Megaphone, MessageCircle, Send, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCommunityPosts } from "@/hooks/useCommunityPosts";
import { toast } from "sonner";

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const Community = () => {
  const [activeCoach, setActiveCoach] = useState<string>(coaches[0].id);
  const [draft, setDraft] = useState("");
  const livePosts = useCommunityPosts(activeCoach);
  const [optimistic, setOptimistic] = useState<CommunityPost[]>([]);

  // When the coach changes, clear optimistic posts (they belong to the
  // previous coach's channel).
  useEffect(() => { setOptimistic([]); }, [activeCoach]);

  const coachPosts: CommunityPost[] = [...optimistic, ...livePosts];
  const coach = findCoach(activeCoach);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const body = draft.trim();
    const post: CommunityPost = {
      id: `cp${Date.now()}`,
      coachId: activeCoach,
      authorName: "You",
      authorIsCoach: false,
      body,
      createdAt: "just now",
      isAnnouncement: false,
      replies: 0,
    };
    // Optimistic UI — render immediately
    setOptimistic((prev) => [post, ...prev]);
    setDraft("");
    toast.success("Posted to the community");

    // Best-effort mirror to Supabase. Mock-data coachIds ("c1"..."c6")
    // skip — only real UUIDs are wired to the DB. RLS will reject if
    // the user isn't subscribed to the coach.
    if (isUuid(activeCoach)) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("community_posts").insert({
            coach_id: activeCoach,
            user_id: user.id,
            body,
            is_announcement: false,
          });
        }
      } catch {
        // optimistic UI keeps the post visible locally
      }
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-6">
          <span className="brutal-tag mb-3"><Users className="h-3 w-3" /> Community</span>
          <h1 className="font-display text-3xl md:text-5xl">Talk with your coaches & cohort</h1>
        </header>

        <div className="brutal-card-sm mb-6 flex gap-1 overflow-x-auto p-2">
          {coaches.slice(0, 5).map((c) => (
            <button key={c.id} onClick={() => setActiveCoach(c.id)} className={cn(
              "shrink-0 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
              activeCoach === c.id ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
            )}>{c.name.split(" ")[0]}</button>
          ))}
        </div>

        <form onSubmit={submit} className="brutal-card-sm mb-6 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Posting in {coach?.name ?? "community"}
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share a win, ask a question, or check in…"
            className="min-h-[80px] w-full resize-none border-2 border-ink bg-surface p-3 text-sm focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <Button type="submit" disabled={!draft.trim()}
              className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
              <Send className="mr-1.5 h-4 w-4" /> Post
            </Button>
          </div>
        </form>

        {coachPosts.length === 0 ? (
          <div className="brutal-card p-10 text-center">
            <p className="font-display text-xl">Nothing here yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Be the first to start a thread.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {coachPosts.map((p) => (
              <article key={p.id} className={cn(
                "brutal-card-sm p-4",
                p.isAnnouncement && "bg-accent/30",
              )}>
                <header className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    {p.isAnnouncement && <Megaphone className="h-3.5 w-3.5" />}
                    <strong className="text-foreground">{p.authorName}</strong>
                    {p.authorIsCoach && <span className="brutal-tag">Coach</span>}
                  </span>
                  <span>{p.createdAt}</span>
                </header>
                <p className="mt-2">{p.body}</p>
                <footer className="mt-3 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                  <button className="inline-flex items-center gap-1 hover:text-foreground">
                    <MessageCircle className="h-3.5 w-3.5" /> {p.replies} replies
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Community;
