import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { coaches } from "@/lib/mock";
import { Image as ImageIcon, FileText, PlayCircle, Type } from "lucide-react";
import { cn } from "@/lib/utils";

const mediaOptions = [
  { id: "text", label: "Text", icon: Type },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: PlayCircle },
  { id: "pdf", label: "PDF", icon: FileText },
] as const;

const NewPost = () => {
  const me = coaches[0];
  const [media, setMedia] = useState<(typeof mediaOptions)[number]["id"]>("text");
  const [tier, setTier] = useState<string | null>(me.tiers[1]?.id ?? null);
  const [body, setBody] = useState("");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
        <Link to="/studio" className="text-xs font-semibold uppercase tracking-wide underline-offset-4 hover:underline">← Back to studio</Link>
        <h1 className="mt-4 font-display text-3xl md:text-4xl">New post</h1>

        <form onSubmit={(e) => { e.preventDefault(); setBody(""); }} className="brutal-card mt-6 space-y-5 p-5">
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
                )}>{t.name} · ${t.price}</button>
              ))}
            </div>
          </div>

          <button type="submit"
            className="w-full border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm">
            Publish
          </button>
        </form>
      </div>
    </AppShell>
  );
};

export default NewPost;
