import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { coaches, posts } from "@/lib/mock";
import { Camera, CreditCard, LogOut, Pencil, Settings, Sparkles, X } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { formatIdr } from "@/lib/utils";
import { toast } from "sonner";

interface ProfileRow {
  display_name: string;
  handle: string;
  bio: string | null;
  headline: string | null;
  avatar_url: string | null;
}

const Me = () => {
  const { user, loading, signOut } = useSession();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isCoach, setIsCoach] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ display_name: "", handle: "", bio: "", headline: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles")
      .select("display_name, handle, bio, headline, avatar_url")
      .eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setProfile(data as ProfileRow));
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role","coach").maybeSingle()
      .then(({ data }) => setIsCoach(!!data));
  }, [user]);

  const openEdit = () => {
    setDraft({
      display_name: profile?.display_name ?? "",
      handle: profile?.handle ?? "",
      bio: profile?.bio ?? "",
      headline: profile?.headline ?? "",
    });
    setEditing(true);
  };

  const save = async () => {
    if (!user) return;
    if (!draft.display_name.trim()) {
      toast.error("Display name is required");
      return;
    }
    const cleanHandle = draft.handle.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanHandle) {
      toast.error("Username is required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        display_name: draft.display_name.trim(),
        handle: cleanHandle,
        bio: draft.bio.trim() || null,
        headline: draft.headline.trim() || null,
      }).eq("id", user.id);
      if (error) throw error;
      setProfile((prev) => prev && {
        ...prev,
        display_name: draft.display_name.trim(),
        handle: cleanHandle,
        bio: draft.bio.trim() || null,
        headline: draft.headline.trim() || null,
      });
      setEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: profErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (profErr) throw profErr;
      setProfile((prev) => prev && { ...prev, avatar_url: publicUrl });
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const subscribed = coaches.slice(0, 2);
  const unread = posts.length;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <header className="brutal-card flex items-center gap-4 p-5">
          <label className="relative h-16 w-16 shrink-0 cursor-pointer border-2 border-ink bg-accent">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center bg-ink/40 text-ink-foreground opacity-0 transition-opacity hover:opacity-100">
              <Camera className="h-5 w-5" />
            </span>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={onAvatarChange}
              disabled={uploading}
            />
          </label>
          <div className="flex-1">
            <h1 className="font-display text-2xl">{profile?.display_name ?? "You"}</h1>
            <p className="text-sm text-muted-foreground">
              {user?.email ?? ""}{profile?.handle ? ` · @${profile.handle}` : ""}
            </p>
            {profile?.headline && <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{profile.headline}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={openEdit} variant="outline" className="border-2 border-ink bg-surface">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button asChild variant="outline" className="border-2 border-ink bg-surface">
              <Link to="/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
            </Button>
          </div>
        </header>

        {profile?.bio && (
          <section className="brutal-card-sm mt-4 p-5">
            <p className="text-sm">{profile.bio}</p>
          </section>
        )}

        <section className="mt-6">
          <h2 className="font-display text-xl">Your subscriptions</h2>
          <div className="mt-3 space-y-3">
            {subscribed.map((c) => (
              <Link key={c.id} to={`/coach/${c.handle}`}
                className="brutal-card-sm flex items-center gap-4 p-4 hover:-translate-x-0.5 hover:-translate-y-0.5">
                <div className="h-12 w-12 border-2 border-ink bg-primary" />
                <div className="flex-1">
                  <div className="font-display">{c.name}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {c.tiers[1]?.name ?? c.tiers[0].name} · {formatIdr(c.tiers[1]?.price ?? c.tiers[0].price)}/mo
                  </div>
                </div>
                <span className="brutal-tag bg-accent">Active</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link to={isCoach ? "/studio" : "/onboarding"} className="brutal-card-sm flex items-center gap-3 p-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <div className="font-display">{isCoach ? "Coach studio" : "Become a coach"}</div>
              <div className="text-xs text-muted-foreground">
                {isCoach ? `Manage your studio · ${unread} drafts ready` : "Open your studio"}
              </div>
            </div>
          </Link>
          <Link to="/settings" className="brutal-card-sm flex items-center gap-3 p-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <div className="font-display">Payment methods</div>
              <div className="text-xs text-muted-foreground">Manage card &amp; billing</div>
            </div>
          </Link>
        </section>

        <button onClick={() => signOut().then(() => navigate("/"))}
          className="mt-10 inline-flex items-center gap-2 border-2 border-ink bg-surface px-4 py-2 text-sm font-semibold uppercase tracking-wide">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 md:items-center"
          onClick={() => !saving && setEditing(false)}>
          <div className="brutal-card w-full max-w-md bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">Edit profile</h3>
              <button onClick={() => !saving && setEditing(false)} disabled={saving}><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Display name</label>
                <input
                  value={draft.display_name}
                  onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                  className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Username</label>
                <input
                  value={draft.handle}
                  onChange={(e) => setDraft({ ...draft, handle: e.target.value })}
                  className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">/coach/{draft.handle.toLowerCase().replace(/[^a-z0-9_]/g, "") || "username"}</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Headline</label>
                <input
                  value={draft.headline}
                  onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
                  placeholder="One-line summary"
                  className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Bio</label>
                <textarea
                  value={draft.bio}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  rows={4}
                  className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" disabled={saving} onClick={() => setEditing(false)}
                className="border-2 border-ink bg-surface">Cancel</Button>
              <Button onClick={save} disabled={saving}
                className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Me;
