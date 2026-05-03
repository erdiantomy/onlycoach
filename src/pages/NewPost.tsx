import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Image as ImageIcon, FileText, PlayCircle, Type, Upload } from "lucide-react";

const mediaOptions = [
  { id: "text", label: "Text", icon: Type },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: PlayCircle },
  { id: "pdf", label: "PDF", icon: FileText },
] as const;

type MediaId = (typeof mediaOptions)[number]["id"];

const NewPost = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<MediaId>("text");
  const [tierId, setTierId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const { data: tiers = [] } = useQuery({
    queryKey: ["my-tiers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await supabase
        .from("subscription_tiers")
        .select("id, name, price_cents")
        .eq("coach_id", user!.id)
        .eq("is_active", true)
        .order("sort_order");
      return res.data ?? [];
    },
  });

  // Default to first paid tier when tiers load
  useEffect(() => {
    if (tiers.length > 0 && tierId === null) {
      setTierId(tiers[0].id);
    }
  }, [tiers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("You must be signed in"); return; }
    if (!body.trim()) { toast.error("Caption is required"); return; }
    setSubmitting(true);

    try {
      // 1. Insert post row
      const { data: post, error: postErr } = await supabase
        .from("posts")
        .insert({
          coach_id: user.id,
          body,
          media_type: media,
          required_tier_id: tierId,
        })
        .select("id")
        .single();

      if (postErr || !post) throw postErr ?? new Error("Failed to create post");

      // 2. Upload media if provided
      if (file && media !== "text") {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${post.id}.${ext}`;
        const { data: signed, error: signErr } = await supabase.storage
          .from("post-media")
          .createSignedUploadUrl(path, { upsert: true });
        if (signErr || !signed) throw signErr ?? new Error("Failed to prepare upload");

        setUploadPct(0);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", signed.signedUrl);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.send(file);
        });
        setUploadPct(100);

        await supabase.from("post_media").insert({
          post_id: post.id,
          storage_path: path,
          mime_type: file.type,
          sort_order: 0,
        });
      }

      toast.success("Post published!");
      navigate("/studio");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setUploadPct(null);
    }
  };

  const formatPrice = (cents: number) =>
    `$${(cents / 100).toFixed(0)}`;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
        <Link
          to="/studio"
          className="text-xs font-semibold uppercase tracking-wide underline-offset-4 hover:underline"
        >
          ← Back to studio
        </Link>
        <h1 className="mt-4 font-display text-3xl md:text-4xl">New post</h1>

        <form
          onSubmit={handleSubmit}
          className="brutal-card mt-6 space-y-5 p-5"
        >
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide">
              Media
            </label>
            <div className="flex flex-wrap gap-2">
              {mediaOptions.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => { setMedia(m.id); setFile(null); }}
                  className={cn(
                    "inline-flex items-center gap-2 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                    media === m.id ? "bg-ink text-ink-foreground" : "bg-surface",
                  )}
                >
                  <m.icon className="h-3.5 w-3.5" /> {m.label}
                </button>
              ))}
            </div>
          </div>

          {media !== "text" && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide">
                Upload
              </label>
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                accept={
                  media === "image"
                    ? "image/*"
                    : media === "video"
                    ? "video/*"
                    : "application/pdf"
                }
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-video w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-ink bg-surface text-sm text-muted-foreground hover:bg-accent/30"
              >
                <Upload className="h-6 w-6" />
                {file ? (
                  <span className="max-w-[80%] truncate font-semibold text-foreground">
                    {file.name}
                  </span>
                ) : (
                  <span>
                    Drop a {media} here, or tap to browse
                  </span>
                )}
              </button>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide">
              Caption
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="What's the workout / lesson / takeaway?"
              className="w-full border-2 border-ink bg-surface p-3 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide">
              Required tier
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTierId(null)}
                className={cn(
                  "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase",
                  tierId === null ? "bg-ink text-ink-foreground" : "bg-surface",
                )}
              >
                Free
              </button>
              {tiers.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTierId(t.id)}
                  className={cn(
                    "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase",
                    tierId === t.id ? "bg-ink text-ink-foreground" : "bg-surface",
                  )}
                >
                  {t.name} · {formatPrice(t.price_cents)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="w-full border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm disabled:opacity-60"
          >
            {submitting ? "Publishing…" : "Publish"}
          </button>
        </form>
      </div>
    </AppShell>
  );
};

export default NewPost;
