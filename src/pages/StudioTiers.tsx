import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { coaches, type Tier } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GripVertical, Plus, Sparkles, Trash2 } from "lucide-react";
import { cn, formatIdr } from "@/lib/utils";
import { toast } from "sonner";

interface DraftTier extends Tier {
  trialDays: number;
  isActive: boolean;
}

const PERK_LIBRARY = [
  "All free posts",
  "Tier-locked posts",
  "Direct messages",
  "Form-check videos",
  "Weekly Q&A audio",
  "Live group call",
  "Monthly 1:1 call",
  "Custom plan",
  "Community access",
  "Priority replies",
];

const MIN_PRICE = 25; // mock-USD; ≈ IDR 25K conversion

const StudioTiers = () => {
  const me = coaches[0];
  const [tiers, setTiers] = useState<DraftTier[]>(() =>
    me.tiers.map((t) => ({ ...t, trialDays: 0, isActive: true })),
  );

  const update = (id: string, patch: Partial<DraftTier>) =>
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const togglePerk = (id: string, perk: string) =>
    update(id, {
      perks: tiers.find((t) => t.id === id)!.perks.includes(perk)
        ? tiers.find((t) => t.id === id)!.perks.filter((p) => p !== perk)
        : [...tiers.find((t) => t.id === id)!.perks, perk],
    });

  const addTier = () => {
    if (tiers.length >= 3) {
      toast.error("3 tiers max — keep it focused.");
      return;
    }
    setTiers((prev) => [
      ...prev,
      {
        id: `t_${Date.now()}`,
        name: prev.length === 0 ? "Basic" : prev.length === 1 ? "Pro" : "VIP",
        price: 25,
        perks: ["Community access"],
        trialDays: 0,
        isActive: true,
      },
    ]);
  };

  const removeTier = (id: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tier removed");
  };

  const move = (id: string, dir: -1 | 1) => {
    setTiers((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const save = () => {
    const invalid = tiers.find((t) => t.price < MIN_PRICE || !t.name.trim());
    if (invalid) {
      toast.error(`Tier "${invalid.name || "Unnamed"}" needs a name and price ≥ ${formatIdr(MIN_PRICE)}.`);
      return;
    }
    toast.success(`${tiers.length} tier${tiers.length === 1 ? "" : "s"} saved`);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Studio
        </Link>

        <header className="mt-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="brutal-tag mb-3"><Sparkles className="h-3 w-3" /> Subscription tiers</span>
            <h1 className="font-display text-3xl md:text-5xl">Up to 3 tiers</h1>
            <p className="mt-1 text-sm text-muted-foreground">Keep it simple — Basic / Pro / VIP works for most coaches.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={addTier} variant="outline"
              className="border-2 border-ink bg-surface" disabled={tiers.length >= 3}>
              <Plus className="mr-1.5 h-4 w-4" /> Add tier
            </Button>
            <Button onClick={save}
              className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
              Save
            </Button>
          </div>
        </header>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <article key={t.id} className={cn(
              "brutal-card relative p-5",
              !t.isActive && "opacity-60",
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => move(t.id, -1)} disabled={i === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Tier {i + 1}</span>
                </div>
                <button onClick={() => removeTier(t.id)}
                  className="border-2 border-ink bg-destructive/10 px-2 py-1 text-destructive hover:bg-destructive/20">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <input
                value={t.name}
                onChange={(e) => update(t.id, { name: e.target.value })}
                placeholder="Tier name"
                className="mt-3 w-full border-2 border-ink bg-surface px-3 py-2 font-display text-lg focus:outline-none"
              />

              <div className="mt-3">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Price (IDR ‘000)</label>
                <input
                  type="number" min={MIN_PRICE} value={t.price}
                  onChange={(e) => update(t.id, { price: Number(e.target.value) })}
                  className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">{formatIdr(t.price)} / mo</p>
              </div>

              <div className="mt-3">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Free trial (days)</label>
                <div className="mt-1 flex gap-1">
                  {[0, 3, 7, 14].map((d) => (
                    <button key={d} type="button" onClick={() => update(t.id, { trialDays: d })}
                      className={cn(
                        "flex-1 border-2 border-ink px-2 py-1.5 text-xs font-semibold uppercase",
                        t.trialDays === d ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
                      )}>
                      {d === 0 ? "None" : `${d}d`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Benefits</label>
                <div className="mt-2 flex flex-wrap gap-1">
                  {PERK_LIBRARY.map((perk) => {
                    const active = t.perks.includes(perk);
                    return (
                      <button key={perk} type="button" onClick={() => togglePerk(t.id, perk)}
                        className={cn(
                          "border-2 border-ink px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
                          active ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-accent/50",
                        )}>
                        {perk}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="mt-4 flex items-center gap-2 text-xs uppercase tracking-wide">
                <input
                  type="checkbox"
                  checked={t.isActive}
                  onChange={(e) => update(t.id, { isActive: e.target.checked })}
                  className="h-4 w-4 border-2 border-ink"
                />
                Active
              </label>

              {i === 1 && tiers.length >= 2 && (
                <span className="brutal-tag absolute -top-3 left-1/2 -translate-x-1/2 bg-accent">
                  Most popular
                </span>
              )}
            </article>
          ))}

          {tiers.length === 0 && (
            <div className="brutal-card lg:col-span-3 p-10 text-center">
              <p className="font-display text-xl">No tiers yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Add at least one tier so subscribers can support you.</p>
              <Button onClick={addTier} className="mt-4 border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add your first tier
              </Button>
            </div>
          )}
        </div>

        <section className="brutal-card-sm mt-8 p-5">
          <h2 className="font-display text-xl">Preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">This is what subscribers see on your profile.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {tiers.filter((t) => t.isActive).map((t, i) => (
              <div key={t.id} className={cn(
                "border-2 border-ink p-4",
                i === 1 ? "bg-accent" : "bg-surface",
              )}>
                <div className="flex items-baseline justify-between">
                  <span className="font-display">{t.name}</span>
                  <span className="font-display">{formatIdr(t.price)}<span className="text-xs">/mo</span></span>
                </div>
                {t.trialDays > 0 && (
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t.trialDays}-day free trial
                  </p>
                )}
                <ul className="mt-2 space-y-1 text-sm">
                  {t.perks.map((p) => <li key={p}>· {p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default StudioTiers;
