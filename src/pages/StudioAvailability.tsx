import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { ArrowLeft, Plus, Trash2, X, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Slot {
  id: string;
  starts_at: string;
  ends_at: string;
  duration_min: number;
  price_cents: number;
  is_booked: boolean;
}

const defaultLocalDateTime = () => {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60_000).toISOString().slice(0, 16);
};

const StudioAvailability = () => {
  const { user } = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    startsAtLocal: defaultLocalDateTime(),
    durationMin: 60,
    priceMajor: 250000,
  });

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["studio-slots", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_slots")
        .select("id, starts_at, ends_at, duration_min, price_cents, is_booked")
        .eq("coach_id", user!.id)
        .order("starts_at");
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });

  const createSlot = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const startsAt = new Date(draft.startsAtLocal);
      if (isNaN(startsAt.getTime())) throw new Error("Invalid start time");
      if (startsAt < new Date()) throw new Error("Start time must be in the future");
      const endsAt = new Date(startsAt.getTime() + draft.durationMin * 60_000);
      const { error } = await supabase.from("availability_slots").insert({
        coach_id: user.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        duration_min: draft.durationMin,
        price_cents: Math.round(draft.priceMajor * 100),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slot added");
      qc.invalidateQueries({ queryKey: ["studio-slots"] });
      setOpen(false);
      setDraft({ startsAtLocal: defaultLocalDateTime(), durationMin: 60, priceMajor: 250000 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("availability_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slot removed");
      qc.invalidateQueries({ queryKey: ["studio-slots"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upcoming = slots.filter((s) => new Date(s.starts_at) >= new Date());

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Studio
        </Link>

        <header className="mt-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="brutal-tag mb-3">1:1 Sessions</span>
            <h1 className="font-display text-3xl md:text-5xl">Availability</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Open time slots for mentees to book paid 1:1 sessions.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 border-2 border-ink bg-accent px-4 py-2.5 text-sm font-semibold uppercase tracking-wide shadow-brutal-sm"
          >
            <Plus className="h-4 w-4" /> Add slot
          </button>
        </header>

        {isLoading ? (
          <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
        ) : upcoming.length === 0 ? (
          <div className="brutal-card mt-8 p-8 text-center text-muted-foreground">
            No upcoming slots. Add a slot to let mentees book a session.
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {upcoming.map((s) => {
              const start = new Date(s.starts_at);
              return (
                <article key={s.id} className="brutal-card-sm flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-display text-lg">
                        {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ·{" "}
                        {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {s.duration_min} min · {formatCurrency(s.price_cents)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.is_booked ? (
                      <span className="border-2 border-ink bg-primary/10 px-2 py-1 text-xs font-semibold uppercase">Booked</span>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm("Remove this slot?")) deleteSlot.mutate(s.id);
                        }}
                        className="border-2 border-ink bg-destructive/10 p-2 text-destructive hover:bg-destructive/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 md:items-center" onClick={() => setOpen(false)}>
          <div className="brutal-card w-full max-w-lg bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">New slot</h3>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide">Start</span>
                <input
                  type="datetime-local"
                  value={draft.startsAtLocal}
                  onChange={(e) => setDraft({ ...draft, startsAtLocal: e.target.value })}
                  className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide">Duration (min)</span>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={draft.durationMin}
                    onChange={(e) => setDraft({ ...draft, durationMin: Number(e.target.value) })}
                    className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide">Price (IDR)</span>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={draft.priceMajor}
                    onChange={(e) => setDraft({ ...draft, priceMajor: Number(e.target.value) })}
                    className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none"
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Mentees pay {formatCurrency(draft.priceMajor, { fromCents: false })} per booking.
              </p>

              <button
                onClick={() => createSlot.mutate()}
                disabled={createSlot.isPending}
                className="w-full border-2 border-ink bg-ink py-3 font-display text-sm uppercase tracking-wide text-ink-foreground shadow-brutal-sm disabled:opacity-60"
              >
                {createSlot.isPending ? "Saving…" : "Add slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default StudioAvailability;
