import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Loader2 } from "lucide-react";

/**
 * Catches the OAuth round-trip and lands the user on their target.
 *
 * Supabase's `detectSessionInUrl: true` already exchanges the code in
 * the URL for a session, but we want a dedicated route so:
 *   - the URL doesn't flash through the app shell with a code in it
 *   - we can route to ?next=/some/path on success
 *   - errors from the OAuth provider land on a sensible UI
 *
 * Configure Google → Supabase like:
 *   1. Supabase dashboard → Authentication → Providers → Google → enable.
 *   2. Add this redirect URL to the Authorized list:
 *        https://<your-domain>/auth/callback
 *   3. Add the same URL to Google Cloud → Credentials → Authorized
 *      redirect URIs for the OAuth client.
 *   4. Set `redirectTo` to `${origin}/auth/callback` in
 *      `signInWithOAuth(...)` (already done in src/pages/Auth.tsx).
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const oauthError = params.get("error_description") ?? params.get("error");
    if (oauthError) {
      setError(oauthError);
      return;
    }
    // Wait for Supabase to finish exchanging the code, then route on.
    supabase.auth.getSession().then(({ data, error: getErr }) => {
      if (cancelled) return;
      if (getErr) {
        setError(getErr.message);
        return;
      }
      const next = params.get("next") || "/feed";
      navigate(data.session ? next : "/auth", { replace: true });
    });
    return () => { cancelled = true; };
  }, [navigate, params]);

  return (
    <AppShell hideTabBar>
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center md:py-24">
        <div className="brutal-card w-full p-8">
          {error ? (
            <>
              <h1 className="font-display text-2xl">Sign-in didn't complete</h1>
              <p className="mt-3 break-words text-sm text-muted-foreground">{error}</p>
              <button
                onClick={() => navigate("/auth", { replace: true })}
                className="mt-6 border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-ink-foreground shadow-brutal-sm">
                Try again
              </button>
            </>
          ) : (
            <>
              <Loader2 aria-hidden className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 font-display text-lg">Finishing sign in…</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Hang tight — completing the secure handshake with Google.
              </p>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default AuthCallback;
