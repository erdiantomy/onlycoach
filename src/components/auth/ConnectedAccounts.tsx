import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Provider = "google" | "apple";

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
];

/**
 * Same-email auto-link: when a logged-in user runs the OAuth flow with a
 * provider whose returned email matches their existing account email,
 * Supabase attaches the new identity to the existing user instead of
 * creating a new one. We rely on that here — no linkIdentity call needed.
 *
 * The button reads `user.identities` (returned by Supabase Auth) to show
 * which providers are already connected.
 */
export const ConnectedAccounts = () => {
  const { user } = useSession();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [identities, setIdentities] = useState<{ provider: string }[]>([]);

  useEffect(() => {
    // user.identities is included on the auth user object.
    const list = (user as any)?.identities as { provider: string }[] | undefined;
    setIdentities(list ?? []);
  }, [user]);

  const linkedProviders = useMemo(
    () => new Set(identities.map((i) => i.provider)),
    [identities],
  );

  const connect = async (provider: Provider) => {
    if (!user?.email) {
      toast.error("You need an email on your account to link a provider");
      return;
    }
    setBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/settings`,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Couldn't start linking flow");
        return;
      }
      // result.redirected → browser will navigate to the provider, return to /settings on success.
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (provider: Provider) => {
    setBusy(provider);
    try {
      // Identity must come from the live user record (not stale state).
      const { data } = await supabase.auth.getUser();
      const identity = data.user?.identities?.find((i) => i.provider === provider);
      if (!identity) {
        toast.error("That account isn't linked");
        return;
      }
      if ((data.user?.identities?.length ?? 0) <= 1) {
        toast.error("Add another sign-in method before removing this one");
        return;
      }
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      toast.success(`${provider === "google" ? "Google" : "Apple"} disconnected`);
      const { data: refreshed } = await supabase.auth.getUser();
      setIdentities(refreshed.user?.identities ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't disconnect");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="brutal-card-sm mt-4 p-5">
      <h2 className="font-display text-xl">Connected accounts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add Google or Apple to sign in faster. Your email must match for auto-linking.
      </p>
      <ul className="mt-3 space-y-2">
        {PROVIDERS.map((p) => {
          const isLinked = linkedProviders.has(p.id);
          const isBusy = busy === p.id;
          return (
            <li
              key={p.id}
              className="flex items-center justify-between border-2 border-ink bg-surface px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-sm">{p.label}</span>
                <span
                  className={cn(
                    "border-2 border-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    isLinked ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground",
                  )}
                >
                  {isLinked ? "Connected" : "Not connected"}
                </span>
              </div>
              {isLinked ? (
                <button
                  disabled={isBusy}
                  onClick={() => disconnect(p.id)}
                  className="border-2 border-ink bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wide disabled:opacity-60"
                >
                  {isBusy ? "…" : "Disconnect"}
                </button>
              ) : (
                <button
                  disabled={isBusy}
                  onClick={() => connect(p.id)}
                  className="border-2 border-ink bg-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-foreground disabled:opacity-60"
                >
                  {isBusy ? "…" : "Connect"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Tip: if linking fails, the provider's email likely doesn't match {user?.email ?? "your account email"}. Sign in with that email at the provider first.
      </p>
    </section>
  );
};
