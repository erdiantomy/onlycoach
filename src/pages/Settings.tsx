import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ConnectedAccounts } from "@/components/auth/ConnectedAccounts";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { X } from "lucide-react";

type Profile = {
  display_name: string;
  handle: string;
  bio: string | null;
  headline: string | null;
  avatar_url: string | null;
};

const Settings = () => {
  const { lang, setLang, t } = useI18n();
  const { user, signOut } = useSession();
  const navigate = useNavigate();

  // Profile section
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<Profile>({
    display_name: "",
    handle: "",
    bio: null,
    headline: null,
    avatar_url: null,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  // Account section
  const [accountOpen, setAccountOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, handle, bio, headline, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setProfileForm(data);
        }
      });
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      let avatarUrl = profileForm.avatar_url;

      // Upload new avatar if file selected
      if (avatarRef.current?.files?.[0]) {
        const file = avatarRef.current.files[0];
        const ext = file.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profileForm.display_name,
          handle: profileForm.handle,
          bio: profileForm.bio,
          headline: profileForm.headline,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (error) throw error;
      setProfile({ ...profileForm, avatar_url: avatarUrl });
      setProfileOpen(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setNewPassword("");
      setAccountOpen(false);
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
        <h1 className="font-display text-3xl md:text-5xl">{t("settings.title")}</h1>

        {/* Language */}
        <section className="brutal-card-sm mt-6 p-5">
          <h2 className="font-display text-xl">{t("settings.language")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.language.helper")}</p>
          <div className="mt-3 flex gap-1">
            {(["en", "id"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  lang === l ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
                )}
              >
                {l === "en" ? "English" : "Bahasa Indonesia"}
              </button>
            ))}
          </div>
        </section>

        {/* Profile */}
        <section className="brutal-card-sm mt-4 p-5">
          <h2 className="font-display text-xl">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Display name, handle, bio.
            {profile && (
              <span className="ml-2 font-medium text-foreground">
                @{profile.handle}
              </span>
            )}
          </p>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="mt-3 border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
          >
            {profileOpen ? "Cancel" : "Manage"}
          </button>

          {profileOpen && (
            <form onSubmit={handleProfileSave} className="mt-4 space-y-3 border-t-2 border-ink pt-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">
                  Display name
                </label>
                <input
                  value={profileForm.display_name}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      display_name: e.target.value,
                    }))
                  }
                  className="w-full border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">
                  Handle
                </label>
                <input
                  value={profileForm.handle}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    }))
                  }
                  className="w-full border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">
                  Headline
                </label>
                <input
                  value={profileForm.headline ?? ""}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, headline: e.target.value }))
                  }
                  className="w-full border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={profileForm.bio ?? ""}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, bio: e.target.value }))
                  }
                  className="w-full border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide">
                  Avatar
                </label>
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/*"
                  className="text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="border-2 border-ink bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide shadow-brutal-sm disabled:opacity-60"
              >
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
            </form>
          )}
        </section>

        {/* Account */}
        <section className="brutal-card-sm mt-4 p-5">
          <h2 className="font-display text-xl">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Email: <span className="font-medium text-foreground">{user?.email ?? "—"}</span>
          </p>
          <button
            onClick={() => setAccountOpen((o) => !o)}
            className="mt-3 border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
          >
            {accountOpen ? "Cancel" : "Change password"}
          </button>

          {accountOpen && (
            <form onSubmit={handlePasswordChange} className="mt-4 flex gap-2 border-t-2 border-ink pt-4">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                minLength={8}
                className="flex-1 border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none"
              />
              <button
                type="submit"
                disabled={savingPassword || !newPassword}
                className="border-2 border-ink bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide shadow-brutal-sm disabled:opacity-60"
              >
                {savingPassword ? "…" : "Update"}
              </button>
            </form>
          )}
        </section>

        <ConnectedAccounts />

        {/* Billing */}
        <section className="brutal-card-sm mt-4 p-5">
          <h2 className="font-display text-xl">Billing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Active subscriptions and cancellations.
          </p>
          <Link
            to="/settings/billing"
            className="mt-3 inline-block border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-accent/50"
          >
            Manage billing
          </Link>
        </section>

        {/* Payouts */}
        <section className="brutal-card-sm mt-4 p-5">
          <h2 className="font-display text-xl">Payouts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Coach payout settings.</p>
          <Link
            to="/payouts"
            className="mt-3 inline-block border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-accent/50"
          >
            Manage payouts
          </Link>
        </section>

        {/* Notifications */}
        <section className="brutal-card-sm mt-4 p-5">
          <h2 className="font-display text-xl">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Email + push notification preferences.
          </p>
          <Link
            to="/settings/notifications"
            className="mt-3 inline-block border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-accent/50"
          >
            Manage notifications
          </Link>
        </section>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="mt-8 inline-flex items-center gap-2 border-2 border-ink bg-surface px-4 py-2 text-sm font-semibold uppercase tracking-wide"
        >
          <X className="h-4 w-4" /> Sign out
        </button>
      </div>
    </AppShell>
  );
};

export default Settings;
