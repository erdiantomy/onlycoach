import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { coaches } from "@/lib/mock";
import { Image as ImageIcon, FileText, PlayCircle, Type, Calendar, Clock, Save, ArrowLeft } from "lucide-react";
import { cn, formatIdr } from "@/lib/utils";
import { toast } from "sonner";

const mediaOptions = [
  { id: "text", label: "Text", icon: Type },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: PlayCircle },
  { id: "pdf", label: "PDF", icon: FileText },
] as const;

type Media = (typeof mediaOptions)[number]["id"];

const DRAFT_KEY = "oc_post_draft";

interface Draft {
  media: Media;
  body: string;
  tier: string | null;
  scheduleAt: string;
  savedAt: number;
}

const NewPost = () => {
  const me = coaches[0];
  const navigate = useNavigate();
  const [media, setMedia] = useState<Media>("text");
  const [tier, setTier] = useState<string | null>(me.tiers[1]?.id ?? null);
  const [body, setBody] = useState("");
  const [schedule, setSchedule] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  // hydrate from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      setMedia(draft.media);
      setBody(draft.body);
      setTier(draft.tier);
      setScheduleAt(draft.scheduleAt);
      setDraftSavedAt(draft.savedAt);
    } catch {
      // ignore corrupt drafts
    }
  }, []);

  const saveDraft = () => {
    if (typeof window === "undefined") return;
    if (!body.trim()) {
      toast.error("Add some text first");
      return;
    }
    const draft: Draft = { media, body, tier, scheduleAt, savedAt: Date.now() };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setDraftSavedAt(draft.savedAt);
    toast.success("Draft saved");
  };

  const clearDraft = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    setDraftSavedAt(null);
    setBody("");
    setMedia("text");
    setTier(me.tiers[1]?.id ?? null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      toast.error("Caption can't be empty");
      return;
    }
    if (schedule) {
      const when = new Date(scheduleAt);
      if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
        toast.error("Schedule a time in the future");
        return;
      }
      toast.success(`Scheduled for ${when.toLocaleString()}`);
    } else {
      toast.success("Published");
    }
    clearDraft();
    navigate("/studio");
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
        <Link to="/studio" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide underline-offset-4 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Studio
        </Link>
        <h1 className="mt-4 font-display text-3xl md:text-4xl">New post</h1>
        {draftSavedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Draft restored — last saved {new Date(draftSavedAt).toLocaleTimeString()}
          </p>
        )}

        <form onSubmit={submit} className="brutal-card mt-6 space-y-5 p-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide">Media</label>
            <div className="flex flex-wrap gap-2">
              {mediaOptions.map((m) => (
                <button type="button" key={m.id} onClick={() => setMedia(m.id)} className={cn(
                  "inline-flex items-center gap-2 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  media === m.id ? "bg-ink text-ink-foreground" : "bg-surface",
                )}><m.icon className="h-3.5 w-3.5" /> {m.label}</button>
              ))}
            </div>
          </div>

          {media !== "text" && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide">Upload</label>
              <div className="flex aspect-video items-center justify-center border-2 border-dashed border-ink bg-surface text-sm text-muted-foreground">
                Drop a {media} here, or tap to browse
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide">Caption</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
              placeholder="What's the workout / lesson / takeaway?"
              className="w-full border-2 border-ink bg-surface p-3 text-sm focus:outline-none" />
            <p className="mt-1 text-right text-xs text-muted-foreground">{body.length} chars</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide">Required tier</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setTier(null)} className={cn(
                "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase",
                tier === null ? "bg-ink text-ink-foreground" : "bg-surface",
              )}>Free</button>
              {me.tiers.map((t) => (
                <button type="button" key={t.id} onClick={() => setTier(t.id)} className={cn(
                  "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase",
                  tier === t.id ? "bg-ink text-ink-foreground" : "bg-surface",
                )}>{t.name} · {formatIdr(t.price)}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <input
                type="checkbox"
                checked={schedule}
                onChange={(e) => setSchedule(e.target.checked)}
                className="h-4 w-4 border-2 border-ink"
              />
              <Calendar className="h-3.5 w-3.5" /> Schedule for later
            </label>
            {schedule && (
              <div className="mt-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={saveDraft}
              className="inline-flex flex-1 items-center justify-center gap-2 border-2 border-ink bg-surface py-3 text-sm font-semibold uppercase tracking-wide">
              <Save className="h-4 w-4" /> Save draft
            </button>
            {draftSavedAt && (
              <button type="button" onClick={clearDraft}
                className="inline-flex items-center justify-center gap-2 border-2 border-ink bg-destructive/10 px-3 py-3 text-sm font-semibold uppercase tracking-wide text-destructive hover:bg-destructive/20">
                Discard draft
              </button>
            )}
            <button type="submit"
              className="flex-1 border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm">
              {schedule ? "Schedule" : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};

export default NewPost;
