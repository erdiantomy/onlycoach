import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { posts, findCoach } from "@/lib/mock";
import { Bookmark, Heart, Lock, MessageSquare, Image as ImageIcon, FileText, PlayCircle } from "lucide-react";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const mediaIcon = {
  text: null,
  image: <ImageIcon className="h-4 w-4" />,
  video: <PlayCircle className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
} as const;

const Feed = () => {
  const { isSaved, toggle } = useSavedPosts();
  return (
  <AppShell>
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

      <div className="space-y-5">
        {posts.map((p) => {
          const coach = findCoach(p.coachId)!;
          const locked = p.requiredTier !== null;
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
                  <button className="inline-flex items-center gap-1 hover:text-foreground"><Heart className="h-4 w-4" /> {p.likes}</button>
                  <button className="inline-flex items-center gap-1 hover:text-foreground"><MessageSquare className="h-4 w-4" /> {p.comments}</button>
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
              </div>
            </article>
          );
        })}
      </div>
    </div>
  </AppShell>
  );
};

export default Feed;
