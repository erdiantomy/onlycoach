import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bookmark, BookmarkX, MessageSquare, Heart } from "lucide-react";
import { toast } from "sonner";

interface SavedRow {
  id: string;
  body: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  coach_id: string;
  coach_name: string;
  coach_handle: string;
}

const SavedPosts = () => {
  const { user } = useSession();
  const { saved, toggle } = useSavedPosts(user?.id);

  const { data: items = [] } = useQuery({
    queryKey: ["saved-posts", saved],
    enabled: saved.length > 0,
    queryFn: async (): Promise<SavedRow[]> => {
      const { data: posts } = await supabase
        .from("posts")
        .select("id, body, created_at, like_count, comment_count, coach_id")
        .in("id", saved);
      const rows = posts ?? [];
      if (rows.length === 0) return [];
      const coachIds = [...new Set(rows.map((p) => p.coach_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, handle")
        .in("id", coachIds);
      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((p) => ({
        ...p,
        coach_name: pm.get(p.coach_id)?.display_name ?? "Coach",
        coach_handle: pm.get(p.coach_id)?.handle ?? "",
      }));
    },
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-12">
        <Link to="/feed" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Feed
        </Link>

        <header className="mt-4 mb-6">
          <span className="brutal-tag mb-3"><Bookmark className="h-3 w-3" /> Saved</span>
          <h1 className="font-display text-3xl md:text-4xl">{items.length} saved post{items.length === 1 ? "" : "s"}</h1>
        </header>

        {items.length === 0 ? (
          <div className="brutal-card p-10 text-center">
            <BookmarkX className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-xl">Nothing saved yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap the bookmark icon on any post to save it for later.
            </p>
            <Link to="/feed"
              className="mt-4 inline-block border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-ink-foreground shadow-brutal-sm">
              Back to feed
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((p) => (
              <article key={p.id} className="brutal-card-sm p-4">
                <header className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <Link to={`/coach/${p.coach_handle}`} className="font-semibold text-foreground hover:underline">
                    {p.coach_name}
                  </Link>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </header>
                <p className="mt-2">{p.body}</p>
                <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4" /> {p.like_count}</span>
                  <span className="inline-flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {p.comment_count}</span>
                  <button
                    onClick={() => { toggle(p.id); toast.success("Removed from saved"); }}
                    className="ml-auto inline-flex items-center gap-1 text-primary hover:text-foreground"
                  >
                    <Bookmark className="h-4 w-4 fill-current" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default SavedPosts;
