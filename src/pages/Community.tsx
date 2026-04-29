import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Megaphone, MessageCircle, Send, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CoachTab {
  id: string;
  display_name: string | null;
  handle: string | null;
}

interface CommunityPost {
  id: string;
  coach_id: string;
  user_id: string;
  body: string;
  is_announcement: boolean;
  created_at: string;
  author_name: string | null;
}

const Community = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [activeCoach, setActiveCoach] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch coaches the user subscribes to (or coaches if user is coach)
  const { data: coaches = [] } = useQuery<CoachTab[]>({
    queryKey: ["community-coaches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("coach_id, profiles!subscriptions_coach_id_fkey(id, display_name, handle)")
        .eq("mentee_id", user!.id)
        .eq("status", "active");
      if (error) throw error;
      const seen = new Set<string>();
      const result: CoachTab[] = [];
      for (const row of data ?? []) {
        const p = row.profiles as unknown as { id: string; display_name: string | null; handle: string | null } | null;
        if (p && !seen.has(p.id)) {
          seen.add(p.id);
          result.push({ id: p.id, display_name: p.display_name, handle: p.handle });
        }
      }
      return result;
    },
  });

  // Set default active coach
  useEffect(() => {
    if (coaches.length > 0 && !activeCoach) {
      setActiveCoach(coaches[0].id);
    }
  }, [coaches, activeCoach]);

  // Fetch posts for active coach
  const { data: posts = [], refetch } = useQuery<CommunityPost[]>({
    queryKey: ["community-posts", activeCoach],
    enabled: !!activeCoach,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, coach_id, user_id, body, is_announcement, created_at, profiles!community_posts_user_id_fkey(display_name)")
        .eq("coach_id", activeCoach!)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const p = row.profiles as unknown as { display_name: string | null } | null;
        return {
          id: row.id,
          coach_id: row.coach_id,
          user_id: row.user_id,
          body: row.body,
          is_announcement: row.is_announcement,
          created_at: row.created_at,
          author_name: p?.display_name ?? "Community member",
        };
      });
    },
  });

  // Realtime subscription for community_posts
  useEffect(() => {
    if (!activeCoach) return;
    channelRef.current?.unsubscribe();
    channelRef.current = supabase
      .channel(`community:${activeCoach}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_posts", filter: `coach_id=eq.${activeCoach}` },
        () => { queryClient.invalidateQueries({ queryKey: ["community-posts", activeCoach] }); },
      )
      .subscribe();
    return () => { channelRef.current?.unsubscribe(); };
  }, [activeCoach, queryClient]);

  const activeCoachName = coaches.find((c) => c.id === activeCoach)?.display_name ?? "community";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !user || !activeCoach) return;
    setSubmitting(true);
    const { error } = await supabase.from("community_posts").insert({
      coach_id: activeCoach,
      user_id: user.id,
      body: draft.trim(),
      is_announcement: false,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't post — check your subscription");
      return;
    }
    setDraft("");
    toast.success("Posted to the community");
    refetch();
  };

  const formatTime = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-6">
          <span className="brutal-tag mb-3"><Users className="h-3 w-3" /> Community</span>
          <h1 className="font-display text-3xl md:text-5xl">Talk with your coaches & cohort</h1>
        </header>

        {coaches.length === 0 ? (
          <div className="brutal-card p-10 text-center">
            <p className="font-display text-xl">No community access yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Subscribe to a coach to join their community.</p>
          </div>
        ) : (
          <>
            <div className="brutal-card-sm mb-6 flex gap-1 overflow-x-auto p-2">
              {coaches.map((c) => (
                <button key={c.id} onClick={() => setActiveCoach(c.id)} className={cn(
                  "shrink-0 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  activeCoach === c.id ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
                )}>{(c.display_name ?? c.handle ?? "Coach").split(" ")[0]}</button>
              ))}
            </div>

            <form onSubmit={submit} className="brutal-card-sm mb-6 p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Posting in {activeCoachName}
              </p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Share a win, ask a question, or check in…"
                className="min-h-[80px] w-full resize-none border-2 border-ink bg-surface p-3 text-sm focus:outline-none"
              />
              <div className="mt-2 flex justify-end">
                <Button type="submit" disabled={!draft.trim() || submitting}
                  className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
                  <Send className="mr-1.5 h-4 w-4" /> Post
                </Button>
              </div>
            </form>

            {posts.length === 0 ? (
              <div className="brutal-card p-10 text-center">
                <p className="font-display text-xl">Nothing here yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Be the first to start a thread.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((p) => (
                  <article key={p.id} className={cn(
                    "brutal-card-sm p-4",
                    p.is_announcement && "bg-accent/30",
                  )}>
                    <header className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        {p.is_announcement && <Megaphone className="h-3.5 w-3.5" />}
                        <strong className="text-foreground">{p.author_name}</strong>
                        {p.coach_id === p.user_id && <span className="brutal-tag">Coach</span>}
                        {p.user_id === user?.id && <span className="brutal-tag">You</span>}
                      </span>
                      <span>{formatTime(p.created_at)}</span>
                    </header>
                    <p className="mt-2">{p.body}</p>
                    <footer className="mt-3 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" /> replies
                      </span>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Community;
