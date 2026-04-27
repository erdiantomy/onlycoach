import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, Plus, X } from "lucide-react";

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
  const [credentials, setCredentials] = useState<string[]>([]);
  const [credentialDraft, setCredentialDraft] = useState("");
  const [socialIg, setSocialIg] = useState("");
  const [socialYt, setSocialYt] = useState("");
  const [socialWeb, setSocialWeb] = useState("");
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

  const totalSteps = role === "coach" ? 4 : 2;

  const addCredential = () => {
    const v = credentialDraft.trim();
    if (!v) return;
    if (credentials.includes(v)) return setCredentialDraft("");
    setCredentials((prev) => [...prev, v]);
    setCredentialDraft("");
  };

  const removeCredential = (c: string) =>
    setCredentials((prev) => prev.filter((x) => x !== c));

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, totalSteps));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const canStep2Continue = displayName.trim() && handle.trim();
  const canStep3Continue = role !== "coach" || (headline.trim() && niche);

  return (
    <AppShell hideTabBar>
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <span>Step {step} of {totalSteps}</span>
          <div className="ml-auto flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={cn("h-1 w-8 border-2 border-ink", i < step ? "bg-primary" : "bg-surface")} />
            ))}
          </div>
        </div>

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
            <button onClick={next}
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
            <div>
              <input value={handle} onChange={(e) => setHandle(e.target.value)}
                placeholder="username (a-z, 0-9, _)"
                className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none" />
              <p className="mt-1 text-xs text-muted-foreground">Your profile lives at /coach/{handle.toLowerCase().replace(/[^a-z0-9_]/g, "") || "username"}</p>
            </div>

            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
              placeholder="Short bio"
              className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none" />

            <div className="flex gap-2">
              <button onClick={back}
                className="flex-1 border-2 border-ink bg-surface py-3 text-sm font-semibold uppercase tracking-wide">
                Back
              </button>
              {role === "coach" ? (
                <button onClick={next} disabled={!canStep2Continue}
                  className="flex-1 border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm disabled:opacity-60">
                  Continue
                </button>
              ) : (
                <button disabled={busy || !canStep2Continue} onClick={finish}
                  className="flex-1 border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm disabled:opacity-60">
                  {busy ? "…" : "Finish"}
                </button>
              )}
            </div>
          </section>
        )}

        {step === 3 && role === "coach" && (
          <section className="brutal-card mt-8 space-y-4 p-5">
            <h2 className="font-display text-xl">Your coaching</h2>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Headline</label>
              <input value={headline} onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Powerlifting & hypertrophy coach"
                className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none" />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Category</label>
              <div className="mt-2 flex flex-wrap gap-1">
                {niches.map((n) => (
                  <button key={n} type="button" onClick={() => setNiche(n)}
                    className={cn(
                      "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                      niche === n ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
                    )}>{n}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Credentials (optional)</label>
              <div className="mt-1 flex gap-2">
                <input value={credentialDraft} onChange={(e) => setCredentialDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCredential())}
                  placeholder="e.g. NSCA-CSCS, RD, ACSM-CPT"
                  className="flex-1 border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
                <button type="button" onClick={addCredential}
                  className="border-2 border-ink bg-surface px-3 hover:bg-accent/50">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {credentials.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {credentials.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 border-2 border-ink bg-primary/10 px-2 py-1 text-xs uppercase">
                      {c}
                      <button type="button" onClick={() => removeCredential(c)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={back}
                className="flex-1 border-2 border-ink bg-surface py-3 text-sm font-semibold uppercase tracking-wide">
                Back
              </button>
              <button onClick={next} disabled={!canStep3Continue}
                className="flex-1 border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm disabled:opacity-60">
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 4 && role === "coach" && (
          <section className="brutal-card mt-8 space-y-4 p-5">
            <h2 className="font-display text-xl">Show off your work</h2>
            <p className="text-sm text-muted-foreground">Optional — add your social links so subscribers can see your range.</p>

            <Field label="Instagram">
              <input value={socialIg} onChange={(e) => setSocialIg(e.target.value)}
                placeholder="@yourhandle"
                className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none" />
            </Field>
            <Field label="YouTube">
              <input value={socialYt} onChange={(e) => setSocialYt(e.target.value)}
                placeholder="channel URL"
                className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none" />
            </Field>
            <Field label="Website">
              <input value={socialWeb} onChange={(e) => setSocialWeb(e.target.value)}
                placeholder="https://"
                className="w-full border-2 border-ink bg-surface px-3 py-2.5 text-sm focus:outline-none" />
            </Field>

            <div className="border-2 border-dashed border-ink bg-surface p-4 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Your studio will open at <strong>/studio</strong> after this step. You can set up your tiers there.
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={back}
                className="flex-1 border-2 border-ink bg-surface py-3 text-sm font-semibold uppercase tracking-wide">
                Back
              </button>
              <button disabled={busy} onClick={finish}
                className="flex-1 border-2 border-ink bg-accent py-3 font-display text-sm uppercase tracking-wide shadow-brutal-sm disabled:opacity-60">
                {busy ? "…" : "Open my studio"}
              </button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

export default Onboarding;
