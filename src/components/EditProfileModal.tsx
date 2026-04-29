import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  role: "coach" | "mentee";
  initial: {
    display_name: string;
    handle: string;
    bio: string | null;
    headline: string | null;
    avatar_url: string | null;
    interests?: string[];
    is_public?: boolean;
    show_subscriptions?: boolean;
  };
}

const INTEREST_OPTIONS = [
  "Strength", "Hypertrophy", "Endurance", "Nutrition", "Mindset",
  "Yoga", "Business", "Running", "Cycling", "HIIT", "Mobility",
];

export const EditProfileModal = ({ open, onClose, role, initial }: Props) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    display_name: initial.display_name,
    handle: initial.handle,
    bio: initial.bio ?? "",
    headline: initial.headline ?? "",
    avatar_url: initial.avatar_url ?? "",
    interests: initial.interests ?? [],
    is_public: initial.is_public ?? true,
    show_subscriptions: initial.show_subscriptions ?? true,
  });

  // Reset when initial changes (modal re-opened)
  useEffect(() => {
    setForm({
      display_name: initial.display_name,
      handle: initial.handle,
      bio: initial.bio ?? "",
      headline: initial.headline ?? "",
      avatar_url: initial.avatar_url ?? "",
      interests: initial.interests ?? [],
      is_public: initial.is_public ?? true,
      show_subscriptions: initial.show_subscriptions ?? true,
    });
    setHandleError("");
    setHandleChecking(false);
  }, [initial, open]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [handleError, setHandleError] = useState("");
  const [handleChecking, setHandleChecking] = useState(false);
  const handleDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const checkHandle = useCallback(
    (value: string) => {
      clearTimeout(handleDebounceRef.current);
      if (!value.trim() || value === initial.handle) { setHandleError(""); return; }
      const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (clean !== value) { setHandleError("Only letters, numbers and underscores"); return; }
      if (value.length < 3) { setHandleError("At least 3 characters"); return; }
      setHandleChecking(true);
      handleDebounceRef.current = setTimeout(async () => {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("handle", value)
          .neq("id", user!.id)
          .maybeSingle();
        setHandleChecking(false);
        setHandleError(data ? "Handle already taken" : "");
      }, 500);
    },
    [user, initial.handle],
  );

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Avatar upload failed"); setUploading(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm((f) => ({ ...f, avatar_url: data.publicUrl + `?t=${Date.now()}` }));
    setUploading(false);
  };

  const toggleInterest = (tag: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(tag)
        ? f.interests.filter((i) => i !== tag)
        : [...f.interests, tag],
    }));
  };

  const save = async () => {
    if (!user) return;
    if (handleError || handleChecking) { toast.error("Fix the handle first"); return; }
    setSaving(true);

    const { error: profileErr } = await supabase.from("profiles").update({
      display_name: form.display_name.trim(),
      handle: form.handle.trim(),
      bio: form.bio.trim() || null,
      headline: form.headline.trim() || null,
      avatar_url: form.avatar_url || null,
    }).eq("id", user.id);

    if (profileErr) { toast.error("Couldn't save profile"); setSaving(false); return; }

    if (role === "mentee") {
      await supabase.from("mentee_profiles").upsert({
        user_id: user.id,
        interests: form.interests,
        is_public: form.is_public,
        show_subscriptions: form.show_subscriptions,
      }, { onConflict: "user_id" });
    }

    queryClient.invalidateQueries({ queryKey: ["coach-profile", form.handle] });
    queryClient.invalidateQueries({ queryKey: ["mentee-profile", form.handle] });
    queryClient.invalidateQueries({ queryKey: ["coach-profile", initial.handle] });
    queryClient.invalidateQueries({ queryKey: ["mentee-profile", initial.handle] });
    toast.success("Profile saved");
    setSaving(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 md:items-center"
      onClick={onClose}
    >
      <div
        className="brutal-card max-h-[92vh] w-full max-w-lg overflow-y-auto bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Edit profile</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 border-2 border-ink bg-accent">
              {form.avatar_url
                ? <img src={form.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                : <div className="h-full w-full" />}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-ink/30 opacity-0 hover:opacity-100 transition-opacity"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold">Profile photo</p>
              <p className="text-xs text-muted-foreground">JPG, PNG. Shown on your public profile.</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-1 text-xs uppercase tracking-wide border-2 border-ink px-2 py-1 bg-surface hover:bg-accent/50"
              >Change photo</button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
            />
          </div>

          <Field label="Display name">
            <input
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
            />
          </Field>

          <Field label="Handle">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <input
                value={form.handle}
                onChange={(e) => {
                  const v = e.target.value.toLowerCase();
                  setForm((f) => ({ ...f, handle: v }));
                  checkHandle(v);
                }}
                className={cn(
                  "w-full border-2 border-ink bg-surface py-2 pl-7 pr-3 text-sm focus:outline-none",
                  handleError && "border-destructive",
                )}
              />
              {handleChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
              {!handleChecking && !handleError && form.handle !== initial.handle && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              )}
            </div>
            {handleError && <p className="mt-1 text-xs text-destructive">{handleError}</p>}
          </Field>

          {role === "coach" && (
            <Field label="Headline">
              <input
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                placeholder="e.g. Strength & hypertrophy coach"
                className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
              />
            </Field>
          )}

          <Field label="Bio">
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Tell the world about yourself…"
              className="min-h-[80px] w-full resize-none border-2 border-ink bg-surface p-3 text-sm focus:outline-none"
            />
          </Field>

          {role === "mentee" && (
            <>
              <Field label="Interests">
                <div className="flex flex-wrap gap-1">
                  {INTEREST_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      className={cn(
                        "border-2 border-ink px-2 py-0.5 text-xs uppercase",
                        form.interests.includes(tag) ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
                      )}
                    >{tag}</button>
                  ))}
                </div>
              </Field>

              <Field label="Privacy">
                <div className="space-y-2">
                  <Toggle
                    label="Public profile"
                    description="Anyone can see your profile page"
                    checked={form.is_public}
                    onChange={(v) => setForm((f) => ({ ...f, is_public: v }))}
                  />
                  <Toggle
                    label="Show subscriptions"
                    description="Display which coaches you follow"
                    checked={form.show_subscriptions}
                    onChange={(v) => setForm((f) => ({ ...f, show_subscriptions: v }))}
                  />
                </div>
              </Field>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="border-2 border-ink bg-surface">
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || uploading || !!handleError || handleChecking}
            className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

const Toggle = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between border-2 border-ink bg-surface p-3">
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "border-2 border-ink px-3 py-1 text-xs font-semibold uppercase",
        checked ? "bg-primary text-primary-foreground" : "bg-surface",
      )}
    >{checked ? "On" : "Off"}</button>
  </div>
);

export default EditProfileModal;
