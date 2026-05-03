import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // null = still figuring it out; true = recovery flow active; false = no recovery context
  const [hasRecovery, setHasRecovery] = useState<boolean | null>(null);
  const navigate = useNavigate();
  usePageTitle("Set a new password");

  // Supabase fires PASSWORD_RECOVERY when the user lands here from the
  // reset-email link. If we don't see a recovery event AND there's no
  // active session that came from one, the form would call
  // updateUser() against nothing and fail in confusing ways. Detect
  // that up front and tell the user.
  useEffect(() => {
    let resolved = false;
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === "PASSWORD_RECOVERY") {
        resolved = true;
        setHasRecovery(true);
      }
    });
    // Also accept an existing session (some flows establish it before
    // onAuthStateChange fires in this component).
    supabase.auth.getSession().then(({ data }) => {
      if (resolved) return;
      setHasRecovery(!!data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    navigate("/feed");
  };

  return (
    <AppShell hideTabBar>
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <h1 className="font-display text-3xl">Set a new password</h1>

        {hasRecovery === false ? (
          <div className="brutal-card mt-6 space-y-3 p-5">
            <p className="text-sm">
              This page only works after you click the reset link in your email.
              The link looks like it expired or was opened in a different browser.
            </p>
            <Link to="/auth"
              className="inline-block border-2 border-ink bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide shadow-brutal-sm">
              Request a new reset email
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="brutal-card mt-6 space-y-4 p-5">
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} placeholder="New password"
              autoComplete="new-password"
              className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none"
            />
            <button disabled={busy || !hasRecovery}
              className="w-full border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm disabled:opacity-60">
              {busy ? "…" : hasRecovery === null ? "Verifying link…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
};

export default ResetPassword;
