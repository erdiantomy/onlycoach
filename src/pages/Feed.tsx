import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { findCoach } from "@/lib/mock";
import { useFeed } from "@/hooks/useFeed";
import { Bookmark, Heart, Lock, MessageSquare, Image as ImageIcon, FileText, PlayCircle, RefreshCw, Send } from "lucide-react";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { usePostEngagement } from "@/hooks/usePostEngagement";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const mediaIcon = {
  text: null,
  image: <ImageIcon className="h-4 w-4" />,
  video: <PlayCircle className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
} as const;

const Feed = () => {
  const { posts, loading } = useFeed();
  const { isSaved, toggle } = useSavedPosts();
  const { isLiked, toggleLike, commentsFor, addComment, removeComment } = usePostEngagement();
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    // Reload the page to refetch the feed. useFeed is mount-keyed so the
    // simplest reliable refresh is to bounce the route data; in production
    // we'd swap to react-query and call queryClient.invalidateQueries().
    await new Promise((r) => setTimeout(r, 400));
    window.location.reload();
  }, []);

  const { pull, refreshing } = usePullToRefresh({ onRefresh: refresh });

  const submitComment = (postId: string) => {
    const body = drafts[postId];
    if (!body?.trim()) return;
    addComment(postId, body);
    setDrafts((prev) => ({ ...prev, [postId]: "" }));
    toast.success("Comment posted");
  };

  return (
    <AppShell>
      {(pull > 0 || refreshing) && (
        <div
          aria-hidden
          style={{ height: pull }}
          className="flex items-center justify-center overflow-hidden bg-accent/30 transition-[height] md:hidden"
        >
          <RefreshCw
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              refreshing && "animate-spin",
            )}
            style={{ transform: refreshing ? undefined : `rotate(${Math.min(pull * 4, 360)}deg)` }}
          />
        </div>
      )}
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-12">
        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-4xl">Your feed</h1>
            <p className="mt-1 text-sm text-muted-foreground">Latest from your coaches.</p>
          </div>
          <Link to="/saved" className="brutal-tag bg-surface">
            <Bookmark className="h-3 w-3" /> Saved
          </Link>
        </header>

        {loading && posts.length === 0 ? (
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} aria-hidden className="brutal-card overflow-hidden">
                <div className="border-b-2 border-ink bg-surface px-4 py-3">
                  <div className="h-4 w-32 animate-pulse bg-background" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="h-3 w-full animate-pulse bg-surface" />
                  <div className="h-3 w-3/4 animate-pulse bg-surface" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="brutal-card p-10 text-center">
            <p className="font-display text-xl">Your feed is empty.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Subscribe to a coach to start filling it.
            </p>
            <Link to="/discover"
              className="mt-4 inline-block border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-ink-foreground shadow-brutal-sm">
              Find coaches
            </Link>
          </div>
        ) : (
        <div className="space-y-5">
          {posts.map((p) => {
            const coach = findCoach(p.coachId);
            if (!coach) return null;
            const locked = p.requiredTier !== null;
            const liked = isLiked(p.id);
            const localComments = commentsFor(p.id);
            const totalComments = p.comments + localComments.length;
            const totalLikes = p.likes + (liked ? 1 : 0);
            const showComments = openComments[p.id];

            return (
              <article key={p.id} className="brutal-card overflow-hidden">
                <header className="flex items-center justify-between border-b-2 border-ink bg-surface px-4 py-3">
                  <Link to={`/coach/${coach.handle}`} className="flex items-center gap-3">
                    <div className="h-9 w-9 border-2 border-ink bg-primary" />
                    <div>
                      <div className="font-display text-sm leading-none">{coach.name}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{coach.niche} · {p.createdAt} ago</div>
                    </div>
                  </Link>
                  {mediaIcon[p.mediaType] && <span className="brutal-tag">{mediaIcon[p.mediaType]} {p.mediaType}</span>}
                </header>

                {locked ? (
                  <div className="relative">
                    <div className="aspect-video bg-primary/90 blur-sm" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/40 p-6 text-center text-primary-foreground">
                      <Lock className="h-6 w-6" />
                      <p className="font-display text-lg">Subscriber-only</p>
                      <Link to={`/coach/${coach.handle}`}
                        className="border-2 border-ink bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink shadow-brutal-sm">
                        Subscribe to unlock
                      </Link>
                    </div>
                  </div>
                ) : p.mediaType !== "text" && <div className="aspect-video border-b-2 border-ink bg-primary" />}

                <div className="p-4">
                  <p>{p.body}</p>
                  <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <button
                      onClick={() => toggleLike(p.id)}
                      aria-pressed={liked}
                      className={cn("inline-flex items-center gap-1 hover:text-foreground", liked && "text-accent")}>
                      <Heart className={cn("h-4 w-4", liked && "fill-current")} /> {totalLikes}
                    </button>
                    <button
                      onClick={() => setOpenComments((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                      className="inline-flex items-center gap-1 hover:text-foreground">
                      <MessageSquare className="h-4 w-4" /> {totalComments}
                    </button>
                    <button
                      onClick={() => { toggle(p.id); toast.success(isSaved(p.id) ? "Removed from saved" : "Saved"); }}
                      className={cn(
                        "ml-auto inline-flex items-center gap-1 hover:text-foreground",
                        isSaved(p.id) && "text-primary",
                      )}
                    >
                      <Bookmark className={cn("h-4 w-4", isSaved(p.id) && "fill-current")} />
                    </button>
                  </div>

                  {showComments && (
                    <div className="mt-4 border-t-2 border-ink/10 pt-4">
                      <div className="space-y-2">
                        {localComments.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Be the first to comment.</p>
                        ) : localComments.map((c) => (
                          <div key={c.id} className="flex items-start gap-2 text-sm">
                            <div className="flex-1">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">You · {c.at}</div>
                              <p>{c.body}</p>
                            </div>
                            <button
                              onClick={() => removeComment(c.id)}
                              className="text-xs uppercase tracking-wide text-muted-foreground hover:text-destructive">
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>

                      <form
                        onSubmit={(e) => { e.preventDefault(); submitComment(p.id); }}
                        className="mt-3 flex items-center gap-2">
                        <input
                          value={drafts[p.id] ?? ""}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="Add a comment…"
                          className="flex-1 border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!drafts[p.id]?.trim()}
                          className="border-2 border-ink bg-ink px-3 py-2 text-ink-foreground shadow-brutal-sm disabled:opacity-40">
                          <Send className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  )}
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

export default Feed;
