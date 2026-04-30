import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { ArrowLeft, Bookmark, BookmarkX, MessageSquare, Heart } from "lucide-react";
import { toast } from "sonner";

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

const SavedPosts = () => {
  const { user } = useSession();
  const { saved, isSaved, toggle } = useSavedPosts(user?.id);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["saved-posts", saved],
    enabled: saved.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, body, created_at, media_type, like_count, comment_count, coach_id, profiles!posts_coach_id_fkey(display_name, handle)")
        .in("id", saved);
      if (error) throw error;
      return (data ?? []).filter((p) => p.profiles !== null);
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

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="brutal-card-sm h-28 animate-pulse bg-surface" />
            ))}
          </div>
        )}

        {!isLoading && saved.length === 0 && (
          <div className="brutal-card p-10 text-center">
            <BookmarkX className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-xl">Nothing saved yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap the bookmark icon on any post to save it for later.
            </p>
            <Link
              to="/feed"
              className="mt-4 inline-block border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-ink-foreground shadow-brutal-sm"
            >
              Back to feed
            </Link>
          </div>
        )}

        {!isLoading && saved.length > 0 && items.length === 0 && (
          <div className="brutal-card p-8 text-center text-muted-foreground">
            <p className="font-display text-lg">Saved posts no longer available.</p>
            <p className="mt-2 text-sm">They may have been deleted by the coach.</p>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-4">
            {items.map((p) => {
              const profile = p.profiles as unknown as { display_name: string; handle: string } | null;
              return (
                <article key={p.id} className="brutal-card-sm p-4">
                  <header className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <Link to={`/coach/${profile?.handle}`} className="font-semibold text-foreground hover:underline">
                      {profile?.display_name ?? "Unknown Coach"}
                    </Link>
                    <span>{timeAgo(p.created_at)} ago</span>
                  </header>
                  <p className="mt-2">{p.body}</p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4" /> {p.like_count}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {p.comment_count}</span>
                    <button
                      onClick={() => { toggle(p.id); toast.success("Removed from saved"); }}
                      className="ml-auto inline-flex items-center gap-1 text-primary hover:text-foreground"
                    >
                      <Bookmark className={`h-4 w-4 ${isSaved(p.id) ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default SavedPosts;
