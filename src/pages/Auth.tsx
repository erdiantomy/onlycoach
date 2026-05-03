import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Auth = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const role = params.get("role") === "coach" ? "coach" : null;
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  usePageTitle(mode === "signup" ? "Create account" : "Sign in");

  // After auth lands the user, route them somewhere sensible. New
  // signups (and "I'm a coach" deep links) go to /onboarding so they
  // can pick role/handle. Returning users go to /feed.
  useEffect(() => {
    if (!user) return;
    const dest = role === "coach"
      ? `/onboarding?role=coach`
      : mode === "signup"
        ? "/onboarding"
        : "/feed";
    navigate(dest, { replace: true });
  }, [user, navigate, mode, role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding${role === "coach" ? "?role=coach" : ""}`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Check your inbox to confirm your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/feed` },
    });
    if (error) toast.error(error.message);
  };

  const reset = async () => {
    if (!email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Reset email sent");
  };

  return (
    <AppShell hideTabBar>
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-10 md:py-16">
        <Logo variant="stacked" className="mx-auto" />
        <div className="brutal-card mt-8 w-full p-6">
          <div className="mb-5 grid grid-cols-2 border-2 border-ink">
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={cn(
                "py-2 text-xs font-semibold uppercase tracking-wide",
                mode === m ? "bg-ink text-ink-foreground" : "bg-surface",
              )}>
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {role === "coach" && mode === "signup" && (
            <p className="mb-3 border-2 border-ink bg-accent/40 p-2 text-xs uppercase tracking-wide">
              You're signing up as a coach.
            </p>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                autoComplete="name"
                className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none"
              />
            )}
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="Email"
              autoComplete="email"
              className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              placeholder="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none"
            />
            <button type="submit" disabled={busy}
              className="w-full border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm disabled:opacity-60">
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
            {mode === "signin" && (
              <button type="button" onClick={reset}
                className="block w-full text-right text-xs text-muted-foreground underline-offset-4 hover:underline">
                Forgot password?
              </button>
            )}
          </form>

          <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <div className="h-px flex-1 bg-ink" /> or <div className="h-px flex-1 bg-ink" />
          </div>

          <button onClick={google}
            className="w-full border-2 border-ink bg-surface py-2.5 text-sm font-semibold uppercase tracking-wide">
            Continue with Google
          </button>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            By continuing you agree to our <Link className="underline" to="/terms">Terms</Link> and <Link className="underline" to="/privacy">Privacy</Link>.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default Auth;
