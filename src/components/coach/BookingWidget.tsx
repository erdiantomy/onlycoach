import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video } from "lucide-react";
import { cn, formatIdr } from "@/lib/utils";
import { toast } from "sonner";

interface Slot {
  id: string;
  date: string;
  startsAt: string;
  durationMin: number;
  price: number;
}

interface Props {
  coachName: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const generateSlots = (): Slot[] => {
  const slots: Slot[] = [];
  const now = new Date();
  for (let i = 1; i <= 5; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    const label = `${DAY_LABELS[day.getDay()]} ${day.getDate()}`;
    [10, 14, 17].forEach((hour, j) => {
      slots.push({
        id: `s_${i}_${hour}`,
        date: label,
        startsAt: `${hour.toString().padStart(2, "0")}:00`,
        durationMin: 30,
        // randomized but stable; real app would query availability_slots
        price: 60 + (j * 10) + (i % 2 === 0 ? 5 : 0),
      });
    });
  }
  return slots;
};

/**
 * Lightweight 1:1 session booking widget for the coach profile aside.
 * Pulls from a generated slot list — production version would query
 * availability_slots and submit to bookings + create-booking-checkout.
 */
export const BookingWidget = ({ coachName }: Props) => {
  const slots = useMemo(generateSlots, []);
  const days = useMemo(() => Array.from(new Set(slots.map((s) => s.date))), [slots]);
  const [activeDay, setActiveDay] = useState(days[0]);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);

  const slotsForDay = slots.filter((s) => s.date === activeDay);

  const book = () => {
    if (!picked) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setPicked(null);
      toast.success(`Booked ${activeDay} at ${picked.startsAt} with ${coachName.split(" ")[0]}`);
    }, 600);
  };

  return (
    <div className="brutal-card p-5">
      <h3 className="font-display text-xl">
        <Video aria-hidden className="mr-1 inline h-5 w-5" /> Book a 1:1
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        30-minute live sessions. Pay per slot — no subscription required.
      </p>

      <div className="mt-4 flex gap-1 overflow-x-auto">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => { setActiveDay(d); setPicked(null); }}
            className={cn(
              "shrink-0 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
              activeDay === d ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
            )}
          >
            <Calendar className="mr-1 inline h-3 w-3" /> {d}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {slotsForDay.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setPicked(s)}
            className={cn(
              "border-2 border-ink p-2 text-left text-xs uppercase tracking-wide",
              picked?.id === s.id ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-accent/50",
            )}
            aria-pressed={picked?.id === s.id}
          >
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {s.startsAt}
            </div>
            <div className="mt-1 font-display text-sm normal-case tracking-normal">
              {formatIdr(s.price)}
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={book}
        disabled={!picked || busy}
        className="mt-4 w-full border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90 disabled:opacity-50"
      >
        {picked
          ? `Book ${activeDay} ${picked.startsAt} · ${formatIdr(picked.price)}`
          : "Pick a slot"}
      </Button>
    </div>
  );
};

export default BookingWidget;
