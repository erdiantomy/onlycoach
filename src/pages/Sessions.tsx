import { AppShell } from "@/components/layout/AppShell";
import { bookings, findCoach } from "@/lib/mock";
import { Calendar, Clock, Video } from "lucide-react";

const Sessions = () => {
  const upcoming = bookings.filter((b) => b.status === "upcoming");
  const past = bookings.filter((b) => b.status !== "upcoming");

  const Card = ({ b }: { b: (typeof bookings)[number] }) => {
    const coach = findCoach(b.coachId)!;
    return (
      <article className="brutal-card-sm flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 border-2 border-ink bg-primary" />
          <div>
            <div className="font-display text-base">{coach.name}</div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{coach.niche}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> {b.startsAt}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {b.durationMin} min</span>
          <span className="font-display">${b.price}</span>
          {b.status === "upcoming" && (
            <button className="border-2 border-ink bg-accent px-3 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-brutal-sm">
              <Video className="mr-1 inline h-3.5 w-3.5" /> Join
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-5xl">Sessions</h1>
          <p className="mt-1 text-muted-foreground">Your live 1:1s.</p>
        </header>

        <section>
          <h2 className="mb-3 font-display text-xl">Upcoming</h2>
          {upcoming.length ? <div className="space-y-3">{upcoming.map((b) => <Card key={b.id} b={b} />)}</div>
            : <div className="brutal-card p-8 text-center text-muted-foreground">No upcoming sessions.</div>}
        </section>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl">Past</h2>
          {past.length ? <div className="space-y-3">{past.map((b) => <Card key={b.id} b={b} />)}</div>
            : <div className="brutal-card p-8 text-center text-muted-foreground">Nothing here yet.</div>}
        </section>
      </div>
    </AppShell>
  );
};

export default Sessions;
