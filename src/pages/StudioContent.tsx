import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { coaches, posts as mockPosts, type Post } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Filter, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Filter = "all" | "free" | "tier-locked" | "draft";

interface DraftPreview {
  body: string;
  media: string;
  tier: string | null;
  scheduleAt: string;
  savedAt: number;
}

const DRAFT_KEY = "oc_post_draft";

const StudioContent = () => {
  const me = coaches[0];
  const [items, setItems] = useState<Post[]>(() => mockPosts.filter((p) => p.coachId === me.id));
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState<DraftPreview | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft(JSON.parse(raw) as DraftPreview);
    } catch {
      // ignore corrupt drafts
    }
  }, []);

  const visible = useMemo(() => {
    if (filter === "free") return items.filter((p) => !p.requiredTier);
    if (filter === "tier-locked") return items.filter((p) => p.requiredTier);
    if (filter === "draft") return [];
    return items;
  }, [filter, items]);

  const remove = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
    toast.success("Post deleted");
  };

  const discardDraft = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    setDraft(null);
    toast.success("Draft discarded");
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Studio
        </Link>

        <header className="mt-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="brutal-tag mb-3"><FileText className="h-3 w-3" /> Content library</span>
            <h1 className="font-display text-3xl md:text-5xl">{items.length} post{items.length === 1 ? "" : "s"}</h1>
          </div>
          <Button asChild className="border-2 border-ink bg-accent text-ink shadow-brutal-sm hover:bg-accent/90">
            <Link to="/studio/post/new"><Plus className="mr-1.5 h-4 w-4" /> New post</Link>
          </Button>
        </header>

        {draft && (
          <section className="brutal-card mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="brutal-tag bg-accent">Draft</span>
                <h2 className="font-display text-lg">{draft.body.slice(0, 60) || "Untitled draft"}</h2>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {draft.media} · saved {new Date(draft.savedAt).toLocaleString()}
                {draft.scheduleAt ? ` · scheduled ${new Date(draft.scheduleAt).toLocaleString()}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="border-2 border-ink bg-surface">
                <Link to="/studio/post/new">Resume</Link>
              </Button>
              <button onClick={discardDraft}
                className="border-2 border-ink bg-destructive/10 px-3 py-2 text-destructive hover:bg-destructive/20">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        <div className="brutal-card-sm mt-6 flex items-center gap-2 p-3 overflow-x-auto">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {(["all", "free", "tier-locked", "draft"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn(
              "shrink-0 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
              filter === f ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
            )}>
              {f === "tier-locked" ? "Tier-locked" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filter === "draft" ? (
          draft ? null : (
            <div className="brutal-card mt-6 p-10 text-center">
              <p className="font-display text-xl">No drafts.</p>
              <p className="mt-2 text-sm text-muted-foreground">Start a new post and tap Save draft to keep it here.</p>
            </div>
          )
        ) : visible.length === 0 ? (
          <div className="brutal-card mt-6 p-10 text-center">
            <p className="font-display text-xl">Nothing here yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Publish your first post to start building.</p>
            <Button asChild className="mt-4 border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm">
              <Link to="/studio/post/new">New post</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {visible.map((p) => (
              <article key={p.id} className="brutal-card-sm flex items-start gap-4 p-4">
                <div className="h-16 w-16 shrink-0 border-2 border-ink bg-primary" aria-hidden />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <span>{p.createdAt} ago</span>
                    <span>·</span>
                    <span>{p.mediaType}</span>
                    <span>·</span>
                    <span>{p.requiredTier ? `Tier-locked (${p.requiredTier})` : "Free"}</span>
                  </div>
                  <p className="mt-1 line-clamp-2">{p.body}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {p.likes} likes · {p.comments} comments
                  </div>
                </div>
                <button onClick={() => remove(p.id)} aria-label="Delete post"
                  className="border-2 border-ink bg-destructive/10 px-2 py-2 text-destructive hover:bg-destructive/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default StudioContent;
