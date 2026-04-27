import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  hint: string;
}

const scorePassword = (pw: string): Strength => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score++;
  const clamp = Math.min(score, 4) as Strength["score"];
  const labels: Record<number, string> = {
    0: "Too short",
    1: "Weak",
    2: "Okay",
    3: "Good",
    4: "Strong",
  };
  const hints: Record<number, string> = {
    0: "Use at least 8 characters.",
    1: "Add a mix of upper- and lower-case letters.",
    2: "Add a number.",
    3: "Add a symbol or make it longer.",
    4: "Looks great.",
  };
  return { score: clamp, label: labels[clamp], hint: hints[clamp] };
};

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const strength = useMemo(() => scorePassword(password), [password]);
  const matches = password.length > 0 && password === confirm;
  const canSubmit = strength.score >= 2 && matches && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matches) {
      toast.error("Passwords don't match");
      return;
    }
    if (strength.score < 2) {
      toast.error("Pick a stronger password — at least 8 chars with mixed case.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. Welcome back.");
    navigate("/feed");
  };

  return (
    <AppShell hideTabBar>
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <span className="brutal-tag mb-3"><ShieldCheck className="h-3 w-3" /> Security</span>
        <h1 className="font-display text-3xl md:text-4xl">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick something fresh. We'll log you straight into your feed once it's saved.
        </p>

        <form onSubmit={submit} className="brutal-card mt-6 space-y-4 p-5">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">New password</label>
            <div className="mt-1 flex items-stretch gap-2">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required minLength={8} autoFocus
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="flex-1 border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none"
              />
              <button type="button" onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="border-2 border-ink bg-surface px-3">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2 flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={cn(
                  "h-1.5 flex-1 border-2 border-ink",
                  i < strength.score
                    ? strength.score >= 3 ? "bg-primary" : strength.score >= 2 ? "bg-accent" : "bg-destructive"
                    : "bg-surface",
                )} />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <strong className="text-foreground">{strength.label}</strong> · {strength.hint}
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Confirm new password</label>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required minLength={8}
              autoComplete="new-password"
              placeholder="Type it again"
              className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none"
            />
            {confirm.length > 0 && (
              <p className={cn(
                "mt-1 text-xs",
                matches ? "text-primary" : "text-destructive",
              )}>
                {matches ? "Matches." : "Doesn't match yet."}
              </p>
            )}
          </div>

          <button type="submit" disabled={!canSubmit}
            className="w-full border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm disabled:opacity-50">
            {busy ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </AppShell>
  );
};

export default ResetPassword;
