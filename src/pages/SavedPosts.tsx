import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { posts, findCoach } from "@/lib/mock";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { ArrowLeft, Bookmark, BookmarkX, MessageSquare, Heart } from "lucide-react";
import { toast } from "sonner";

const SavedPosts = () => {
  const { saved, toggle } = useSavedPosts();
  const items = posts.filter((p) => saved.includes(p.id));

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
            {items.map((p) => {
              const coach = findCoach(p.coachId)!;
              return (
                <article key={p.id} className="brutal-card-sm p-4">
                  <header className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <Link to={`/coach/${coach.handle}`} className="font-semibold text-foreground hover:underline">
                      {coach.name}
                    </Link>
                    <span>{p.createdAt} ago</span>
                  </header>
                  <p className="mt-2">{p.body}</p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4" /> {p.likes}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {p.comments}</span>
                    <button
                      onClick={() => { toggle(p.id); toast.success("Removed from saved"); }}
                      className="ml-auto inline-flex items-center gap-1 text-primary hover:text-foreground"
                    >
                      <Bookmark className="h-4 w-4 fill-current" />
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
