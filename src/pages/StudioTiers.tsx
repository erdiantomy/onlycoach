import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Tier {
  id: string;
  name: string;
  price_cents: number;
  perks: string[];
  is_active: boolean;
  sort_order: number;
}

const StudioTiers = () => {
  const { user } = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tier | null>(null);
  const [draft, setDraft] = useState({ name: "", priceMajor: 100000, perks: "" });

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ["studio-tiers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_tiers")
        .select("id, name, price_cents, perks, is_active, sort_order")
        .eq("coach_id", user!.id)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Tier[];
    },
  });

  const reset = () => {
    setEditing(null);
    setDraft({ name: "", priceMajor: 100000, perks: "" });
    setOpen(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!draft.name.trim()) throw new Error("Name is required");
      const perks = draft.perks.split("\n").map((p) => p.trim()).filter(Boolean);
      const price_cents = Math.round(draft.priceMajor * 100);
      if (editing) {
        const { error } = await supabase
          .from("subscription_tiers")
          .update({ name: draft.name, price_cents, perks })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subscription_tiers").insert({
          coach_id: user.id,
          name: draft.name,
          price_cents,
          perks,
          sort_order: tiers.length,
          is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Tier updated" : "Tier created");
      qc.invalidateQueries({ queryKey: ["studio-tiers"] });
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (t: Tier) => {
      const { error } = await supabase
        .from("subscription_tiers")
        .update({ is_active: !t.is_active })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["studio-tiers"] }),
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_tiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tier deleted");
      qc.invalidateQueries({ queryKey: ["studio-tiers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (t: Tier) => {
    setEditing(t);
    setDraft({
      name: t.name,
      priceMajor: t.price_cents / 100,
      perks: (t.perks ?? []).join("\n"),
    });
    setOpen(true);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Studio
        </Link>

        <header className="mt-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="brutal-tag mb-3">Pricing</span>
            <h1 className="font-display text-3xl md:text-5xl">Subscription tiers</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Set monthly subscription tiers in IDR. Active tiers are visible on your profile.
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setDraft({ name: "", priceMajor: 100000, perks: "" }); setOpen(true); }}
            className="inline-flex items-center gap-2 border-2 border-ink bg-accent px-4 py-2.5 text-sm font-semibold uppercase tracking-wide shadow-brutal-sm"
          >
            <Plus className="h-4 w-4" /> New tier
          </button>
        </header>

        {isLoading ? (
          <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
        ) : tiers.length === 0 ? (
          <div className="brutal-card mt-8 p-8 text-center text-muted-foreground">
            No tiers yet. Create your first tier to start accepting subscribers.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {tiers.map((t) => (
              <article key={t.id} className={cn("brutal-card-sm p-5", !t.is_active && "opacity-60")}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-2xl">{t.name}</h3>
                    <div className="mt-1 font-display text-xl">
                      {formatCurrency(t.price_cents)}<span className="text-xs text-muted-foreground">/mo</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete tier "${t.name}"? Existing subscribers will keep their access until period end.`)) {
                        deleteTier.mutate(t.id);
                      }
                    }}
                    className="border-2 border-ink bg-destructive/10 p-2 text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {t.perks?.length > 0 && (
                  <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
                    {t.perks.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => startEdit(t)}
                    className="border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive.mutate(t)}
                    className="border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase"
                  >
                    {t.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 md:items-center" onClick={reset}>
          <div className="brutal-card max-h-[90vh] w-full max-w-lg overflow-y-auto bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">{editing ? "Edit tier" : "New tier"}</h3>
              <button onClick={reset}><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide">Name</span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Inner Circle"
                  className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide">Monthly price (IDR)</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={draft.priceMajor}
                  onChange={(e) => setDraft({ ...draft, priceMajor: Number(e.target.value) })}
                  className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Preview: {formatCurrency(draft.priceMajor, { fromCents: false })}/mo
                </p>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide">Perks (one per line)</span>
                <textarea
                  value={draft.perks}
                  onChange={(e) => setDraft({ ...draft, perks: e.target.value })}
                  rows={5}
                  placeholder={"Weekly Q&A\nDirect messages\nPrivate community"}
                  className="w-full resize-none border-2 border-ink bg-surface p-3 text-sm focus:outline-none"
                />
              </label>

              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full border-2 border-ink bg-ink py-3 font-display text-sm uppercase tracking-wide text-ink-foreground shadow-brutal-sm disabled:opacity-60"
              >
                {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Create tier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default StudioTiers;
