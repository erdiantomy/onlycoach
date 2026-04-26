import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

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
        <form onSubmit={submit} className="brutal-card mt-6 space-y-4 p-5">
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            required minLength={6} placeholder="New password"
            className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none"
          />
          <button disabled={busy}
            className="w-full border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm">
            {busy ? "…" : "Update password"}
          </button>
        </form>
      </div>
    </AppShell>
  );
};

export default ResetPassword;
