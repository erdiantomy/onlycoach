import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Method = "email" | "phone";

const Auth = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const next = params.get("from") || params.get("next") || "/feed";
  const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, navigate, next]);

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
    if (digits.startsWith("62")) return `+${digits}`;
    if (raw.startsWith("+")) return raw;
    return `+${digits}`;
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callbackUrl,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const normalized = normalizePhone(phone);
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: {
          shouldCreateUser: mode === "signup",
          data: mode === "signup" ? { display_name: displayName || `user_${normalized.slice(-4)}` } : undefined,
        },
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success(`Code sent to ${normalized}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: normalizePhone(phone),
        token: otp,
        type: "sms",
      });
      if (error) throw error;
      toast.success("Signed in.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        // Ask Google for offline access so refresh works without
        // re-prompting the user every time the access token expires.
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) toast.error(error.message);
  };

  const reset = async () => {
    if (!email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
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
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setOtpSent(false);
                  setOtp("");
                }}
                className={cn(
                  "py-2 text-xs font-semibold uppercase tracking-wide",
                  mode === m ? "bg-ink text-ink-foreground" : "bg-surface",
                )}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <div className="mb-4 flex gap-1">
            {(["email", "phone"] as Method[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMethod(m);
                  setOtpSent(false);
                  setOtp("");
                }}
                className={cn(
                  "flex-1 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  method === m ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
                )}
              >
                {m === "email" ? "Email" : "Phone (OTP)"}
              </button>
            ))}
          </div>

          {method === "email" ? (
            <form onSubmit={submitEmail} className="space-y-3">
              {mode === "signup" && (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none"
                />
              )}
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="Email"
                className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none"
              />
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                placeholder="Password"
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
          ) : (
            <form onSubmit={otpSent ? verifyOtp : sendOtp} className="space-y-3">
              {mode === "signup" && !otpSent && (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none"
                />
              )}
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required
                disabled={otpSent}
                placeholder="0812-3456-7890"
                inputMode="tel"
                className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none disabled:opacity-60"
              />
              <p className="text-[11px] text-muted-foreground">
                We default to +62 (Indonesia). Include the country code for other regions.
              </p>
              {otpSent && (
                <input
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-center font-mono text-base tracking-[0.4em] focus:outline-none"
                />
              )}
              <button type="submit" disabled={busy || (otpSent && otp.length < 6)}
                className="w-full border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm disabled:opacity-60">
                {busy ? "…" : otpSent ? "Verify code" : "Send code"}
              </button>
              {otpSent && (
                <button type="button"
                  onClick={() => { setOtpSent(false); setOtp(""); }}
                  className="block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline">
                  Change number
                </button>
              )}
            </form>
          )}

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
