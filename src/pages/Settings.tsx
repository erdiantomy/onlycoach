import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

interface ProfileRow {
  display_name: string | null;
  handle: string | null;
  bio: string | null;
  headline: string | null;
}

const Settings = () => {
  const { user, loading, signOut } = useSession();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  usePageTitle("Settings");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, handle, bio, headline")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => data && setProfile(data));
  }, [user]);

  const saveProfile = async () => {
    if (!user || !profile) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        handle: profile.handle?.toLowerCase().replace(/[^a-z0-9_]/g, ""),
        bio: profile.bio,
        headline: profile.headline,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    setEditingProfile(false);
  };

  const requestPasswordChange = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
        <h1 className="font-display text-3xl md:text-5xl">Settings</h1>

        {/* Profile */}
        <section className="brutal-card-sm mt-6 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Profile</h2>
            <button
              onClick={() => setEditingProfile((v) => !v)}
              className="border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
            >
              {editingProfile ? "Cancel" : "Manage"}
            </button>
          </div>
          {!editingProfile ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Display name, handle, bio.
              {profile?.handle && <span className="ml-1">· @{profile.handle}</span>}
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide">Display name
                <input value={profile?.display_name ?? ""}
                  onChange={(e) => setProfile({ ...profile!, display_name: e.target.value })}
                  className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide">Handle
                <input value={profile?.handle ?? ""}
                  onChange={(e) => setProfile({ ...profile!, handle: e.target.value })}
                  className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide">Headline
                <input value={profile?.headline ?? ""}
                  onChange={(e) => setProfile({ ...profile!, headline: e.target.value })}
                  className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide">Bio
                <textarea value={profile?.bio ?? ""} rows={3}
                  onChange={(e) => setProfile({ ...profile!, bio: e.target.value })}
                  className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
              </label>
              <button disabled={busy} onClick={saveProfile}
                className="border-2 border-ink bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide shadow-brutal-sm disabled:opacity-60">
                {busy ? "Saving…" : "Save profile"}
              </button>
            </div>
          )}
        </section>

        {/* Account */}
        <section className="brutal-card-sm mt-4 p-5">
          <h2 className="font-display text-xl">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Email: {user?.email ?? "—"}</p>
          <button onClick={requestPasswordChange}
            className="mt-3 border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
            Send password reset email
          </button>
        </section>

        {/* Subscriptions — replaces the "Billing — Coming soon" stub
             with the real list of active subs the mentee holds. Cancel
             still happens on the coach profile page (CoachProfile.tsx)
             where subscriptions are scoped per-coach. */}
        <section className="brutal-card-sm mt-4 p-5">
          <h2 className="font-display text-xl">Subscriptions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Active subscriptions and billing history live on each coach's profile.
            Open a subscription's coach page to switch tier or cancel at period end.
          </p>
          <Link to="/me"
            className="mt-3 inline-block border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
            View my subscriptions
          </Link>
        </section>

        {/* Sign out */}
        <button onClick={() => signOut().then(() => navigate("/"))}
          className="mt-8 inline-flex items-center gap-2 border-2 border-ink bg-surface px-4 py-2 text-sm font-semibold uppercase tracking-wide">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </AppShell>
  );
};

export default Settings;
