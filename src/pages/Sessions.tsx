import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Video } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

type Booking = {
  id: string;
  coach_id: string;
  coach_name: string;
  starts_at: string;
  duration_min: number;
  price_cents: number;
  status: string;
  meeting_url: string | null;
};

const Sessions = () => {
  const { user } = useSession();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Booking[]> => {
      const res = await supabase
        .from("bookings")
        .select("id, coach_id, starts_at, duration_min, price_cents, status, meeting_url")
        .eq("mentee_id", user!.id)
        .order("starts_at", { ascending: false });

      const rows = res.data ?? [];
      if (rows.length === 0) return [];

      const coachIds = [...new Set(rows.map((r) => r.coach_id))];
      const profilesRes = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", coachIds);

      const pm = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));

      return rows.map((r) => ({
        id: r.id,
        coach_id: r.coach_id,
        coach_name: pm.get(r.coach_id)?.display_name ?? "Coach",
        starts_at: r.starts_at,
        duration_min: r.duration_min,
        price_cents: r.price_cents,
        status: r.status,
        meeting_url: r.meeting_url,
      }));
    },
  });

  const upcoming = bookings.filter((b) =>
    b.status === "pending" || b.status === "confirmed",
  );
  const past = bookings.filter((b) =>
    b.status === "completed" || b.status === "cancelled",
  );

  const handleJoin = (b: Booking) => {
    if (b.meeting_url) {
      window.open(b.meeting_url, "_blank", "noopener");
    } else {
      toast.info("Meeting link not yet available — check back closer to the session.");
    }
  };

  const formatPrice = (cents: number) => formatCurrency(cents);

  const Card = ({ b }: { b: Booking }) => (
    <article className="brutal-card-sm flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 border-2 border-ink bg-primary" />
        <div>
          <div className="font-display text-base">{b.coach_name}</div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground capitalize">
            {b.status}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {new Date(b.starts_at).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4" /> {b.duration_min} min
        </span>
        <span className="font-display text-sm">{formatPrice(b.price_cents)}</span>
        {(b.status === "pending" || b.status === "confirmed") && (
          <button
            onClick={() => handleJoin(b)}
            className="border-2 border-ink bg-accent px-3 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-brutal-sm"
          >
            <Video className="mr-1 inline h-3.5 w-3.5" /> Join
          </button>
        )}
      </div>
    </article>
  );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-5xl">Sessions</h1>
          <p className="mt-1 text-muted-foreground">Your live 1:1s.</p>
        </header>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="brutal-card-sm h-20 animate-pulse bg-surface" />
            ))}
          </div>
        )}

        {!isLoading && (
          <>
            <section>
              <h2 className="mb-3 font-display text-xl">Upcoming</h2>
              {upcoming.length ? (
                <div className="space-y-3">
                  {upcoming.map((b) => <Card key={b.id} b={b} />)}
                </div>
              ) : (
                <div className="brutal-card p-8 text-center text-muted-foreground">
                  No upcoming sessions.
                </div>
              )}
            </section>

            <section className="mt-10">
              <h2 className="mb-3 font-display text-xl">Past</h2>
              {past.length ? (
                <div className="space-y-3">
                  {past.map((b) => <Card key={b.id} b={b} />)}
                </div>
              ) : (
                <div className="brutal-card p-8 text-center text-muted-foreground">
                  Nothing here yet.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Sessions;
