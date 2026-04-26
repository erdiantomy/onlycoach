import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Role = "mentee" | "coach";
const niches = ["Strength","Mindset","Endurance","Nutrition","Yoga","Business","Other"] as const;

const Onboarding = () => {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>("mentee");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [headline, setHeadline] = useState("");
  const [niche, setNiche] = useState<typeof niches[number]>("Other");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (user) {
      supabase.from("profiles").select("handle, display_name").eq("id", user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setHandle(data.handle ?? "");
            setDisplayName(data.display_name ?? "");
          }
        });
    }
  }, [user, loading, navigate]);

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const cleanHandle = handle.toLowerCase().replace(/[^a-z0-9_]/g, "");
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ handle: cleanHandle, display_name: displayName, bio, headline })
        .eq("id", user.id);
      if (pErr) throw pErr;

      if (role === "coach") {
        const { error: rErr } = await supabase.from("user_roles").insert({ user_id: user.id, role: "coach" });
        if (rErr && !rErr.message.includes("duplicate")) throw rErr;
        const { error: cErr } = await supabase.from("coach_profiles").upsert({
          user_id: user.id, niche, is_published: true,
        });
        if (cErr) throw cErr;
      }
      toast.success("Profile saved");
      navigate(role === "coach" ? "/studio" : "/discover");
    } catch (err: any) {
      toast.error(err.message ?? "Could not save profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell hideTabBar>
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <h1 className="font-display text-3xl md:text-4xl">Welcome to ONLY/COACH</h1>
        <p className="mt-2 text-muted-foreground">A few quick details to set up your account.</p>

        {step === 1 && (
          <section className="brutal-card mt-8 p-5">
            <h2 className="font-display text-xl">I'm here to…</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["mentee","coach"] as Role[]).map((r) => (
                <button key={r} onClick={() => setRole(r)}
                  className={cn("border-2 border-ink p-4 text-left",
                    role === r ? "bg-ink text-ink-foreground" : "bg-surface")}>
                  <div className="font-display text-lg">{r === "mentee" ? "Learn" : "Coach"}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide opacity-80">
                    {r === "mentee" ? "Subscribe to coaches" : "Open a paid studio"}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)}
              className="mt-5 w-full border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm">
              Continue
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="brutal-card mt-8 space-y-4 p-5">
            <h2 className="font-display text-xl">Your profile</h2>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none" />
            <input value={handle} onChange={(e) => setHandle(e.target.value)}
              placeholder="username (a-z, 0-9, _)"
              className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none" />

            {role === "coach" && (
              <>
                <input value={headline} onChange={(e) => setHeadline(e.target.value)}
                  placeholder="One-line headline (e.g. Powerlifting coach)"
                  className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none" />
                <select value={niche} onChange={(e) => setNiche(e.target.value as typeof niche)}
                  className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none">
                  {niches.map((n) => <option key={n}>{n}</option>)}
                </select>
              </>
            )}

            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
              placeholder="Short bio"
              className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none" />

            <div className="flex gap-2">
              <button onClick={() => setStep(1)}
                className="flex-1 border-2 border-ink bg-surface py-3 text-sm font-semibold uppercase tracking-wide">
                Back
              </button>
              <button disabled={busy} onClick={finish}
                className="flex-1 border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm disabled:opacity-60">
                {busy ? "…" : "Finish"}
              </button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
};

export default Onboarding;
