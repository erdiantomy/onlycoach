import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Bookmark,
  Heart,
  Lock,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  PlayCircle,
  Send,
  X,
} from "lucide-react";

type FeedPost = {
  id: string;
  body: string;
  created_at: string;
  media_type: "text" | "image" | "video" | "pdf";
  required_tier_id: string | null;
  like_count: number;
  comment_count: number;
  coach_id: string;
  coach_display_name: string;
  coach_handle: string;
  is_locked: boolean;
  user_liked: boolean;
};

const mediaIcon = {
  text: null,
  image: <ImageIcon className="h-4 w-4" />,
  video: <PlayCircle className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
} as const;

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

const Feed = () => {
  const { user } = useSession();
  const { isSaved, toggle } = useSavedPosts(user?.id);
  const queryClient = useQueryClient();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["feed", user?.id],
    queryFn: async (): Promise<FeedPost[]> => {
      const [postsRes, activeTiersRes, likesRes] = await Promise.all([
        supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        user
          ? supabase
              .from("subscriptions")
              .select("tier_id")
              .eq("mentee_id", user.id)
              .eq("status", "active")
          : Promise.resolve({ data: [] as { tier_id: string }[] }),
        user
          ? supabase
              .from("post_likes")
              .select("post_id")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as { post_id: string }[] }),
      ]);

      const rawPosts = postsRes.data ?? [];
      const activeTierIds = new Set(
        (activeTiersRes.data ?? []).map((s) => s.tier_id),
      );
      const likedIds = new Set(
        (likesRes.data ?? []).map((l) => l.post_id),
      );

      const coachIds = [...new Set(rawPosts.map((p) => p.coach_id))];
      const profilesData =
        coachIds.length > 0
          ? (
              await supabase
                .from("profiles")
                .select("id, display_name, handle")
                .in("id", coachIds)
            ).data ?? []
          : [];

      const profileMap = new Map(profilesData.map((p) => [p.id, p]));

      return rawPosts.map((p) => {
        const profile = profileMap.get(p.coach_id);
        const isLocked =
          p.required_tier_id !== null &&
          !activeTierIds.has(p.required_tier_id);
        return {
          id: p.id,
          body: p.body,
          created_at: p.created_at,
          media_type: p.media_type,
          required_tier_id: p.required_tier_id,
          like_count: p.like_count,
          comment_count: p.comment_count,
          coach_id: p.coach_id,
          coach_display_name: profile?.display_name ?? "Unknown Coach",
          coach_handle: profile?.handle ?? "",
          is_locked: isLocked,
          user_liked: likedIds.has(p.id),
        };
      });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async ({
      postId,
      liked,
    }: {
      postId: string;
      liked: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (liked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });
      }
    },
    onMutate: async ({ postId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ["feed", user?.id] });
      const prev = queryClient.getQueryData<FeedPost[]>(["feed", user?.id]);
      queryClient.setQueryData<FeedPost[]>(["feed", user?.id], (old = []) =>
        old.map((p) =>
          p.id === postId
            ? {
                ...p,
                user_liked: !liked,
                like_count: p.like_count + (liked ? -1 : 1),
              }
            : p,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(["feed", user?.id], ctx.prev);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({
      postId,
      body,
    }: {
      postId: string;
      body: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      await supabase
        .from("post_comments")
        .insert({ post_id: postId, user_id: user.id, body });
    },
    onSuccess: (_data, { postId }) => {
      queryClient.setQueryData<FeedPost[]>(["feed", user?.id], (old = []) =>
        old.map((p) =>
          p.id === postId
            ? { ...p, comment_count: p.comment_count + 1 }
            : p,
        ),
      );
      setCommentText("");
      setCommentPostId(null);
      toast.success("Comment posted");
    },
  });

  const handleLike = (post: FeedPost) => {
    if (!user) {
      toast.error("Sign in to like posts");
      return;
    }
    likeMutation.mutate({ postId: post.id, liked: post.user_liked });
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !commentPostId) return;
    commentMutation.mutate({ postId: commentPostId, body: commentText });
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-12">
        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-4xl">Your feed</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest from your coaches.
            </p>
          </div>
          <Link to="/saved" className="brutal-tag bg-surface">
            <Bookmark className="h-3 w-3" /> Saved
          </Link>
        </header>

        {isLoading && (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="brutal-card h-48 animate-pulse bg-surface"
              />
            ))}
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="brutal-card p-10 text-center text-muted-foreground">
            <p className="font-display text-lg">Nothing here yet.</p>
            <p className="mt-2 text-sm">
              Subscribe to coaches to see their posts.
            </p>
            <Link
              to="/discover"
              className="mt-4 inline-block border-2 border-ink bg-accent px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-brutal-sm"
            >
              Discover coaches
            </Link>
          </div>
        )}

        <div className="space-y-5">
          {posts.map((p) => (
            <article key={p.id} className="brutal-card overflow-hidden">
              <header className="flex items-center justify-between border-b-2 border-ink bg-surface px-4 py-3">
                <Link
                  to={`/coach/${p.coach_handle}`}
                  className="flex items-center gap-3"
                >
                  <div className="h-9 w-9 border-2 border-ink bg-primary" />
                  <div>
                    <div className="font-display text-sm leading-none">
                      {p.coach_display_name}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {timeAgo(p.created_at)} ago
                    </div>
                  </div>
                </Link>
                {mediaIcon[p.media_type] && (
                  <span className="brutal-tag">
                    {mediaIcon[p.media_type]} {p.media_type}
                  </span>
                )}
              </header>

              {p.is_locked ? (
                <div className="relative">
                  <div className="aspect-video bg-primary/90 blur-sm" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/40 p-6 text-center text-primary-foreground">
                    <Lock className="h-6 w-6" />
                    <p className="font-display text-lg">Subscriber-only</p>
                    <Link
                      to={`/coach/${p.coach_handle}`}
                      className="border-2 border-ink bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink shadow-brutal-sm"
                    >
                      Subscribe to unlock
                    </Link>
                  </div>
                </div>
              ) : (
                p.media_type !== "text" && (
                  <div className="aspect-video border-b-2 border-ink bg-primary" />
                )
              )}

              <div className="p-4">
                <p>{p.body}</p>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <button
                    onClick={() => handleLike(p)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-foreground",
                      p.user_liked && "text-primary",
                    )}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        p.user_liked && "fill-current",
                      )}
                    />
                    {p.like_count}
                  </button>
                  <button
                    onClick={() =>
                      setCommentPostId((cur) =>
                        cur === p.id ? null : p.id,
                      )
                    }
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <MessageSquare className="h-4 w-4" /> {p.comment_count}
                  </button>
                  <button
                    onClick={() => {
                      toggle(p.id);
                      toast.success(
                        isSaved(p.id) ? "Removed from saved" : "Saved",
                      );
                    }}
                    className={cn(
                      "ml-auto inline-flex items-center gap-1 hover:text-foreground",
                      isSaved(p.id) && "text-primary",
                    )}
                  >
                    <Bookmark
                      className={cn(
                        "h-4 w-4",
                        isSaved(p.id) && "fill-current",
                      )}
                    />
                  </button>
                </div>

                {commentPostId === p.id && (
                  <form
                    onSubmit={handleCommentSubmit}
                    className="mt-3 flex items-center gap-2 border-t-2 border-ink pt-3"
                  >
                    <input
                      autoFocus
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment…"
                      className="flex-1 border-2 border-ink bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="border-2 border-ink bg-ink p-1.5 text-ink-foreground disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentPostId(null)}
                      className="border-2 border-ink bg-surface p-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default Feed;
