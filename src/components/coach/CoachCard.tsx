import { Link } from "react-router-dom";
import { Star, Users } from "lucide-react";
import type { Coach } from "@/lib/mock";
import { formatIdr } from "@/lib/utils";

export const CoachCard = ({ coach }: { coach: Coach }) => {
  const startingPrice = Math.min(...coach.tiers.map((t) => t.price));
  return (
    <Link to={`/coach/${coach.handle}`} className="group block">
      <article className="brutal-card-sm overflow-hidden transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5">
        <div className="relative aspect-[4/5] border-b-2 border-ink bg-primary">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/40" />
          <span className="brutal-tag absolute left-3 top-3 bg-surface">{coach.niche}</span>
          <div className="absolute bottom-3 left-3 right-3 text-primary-foreground">
            <h3 className="font-display text-2xl leading-none">{coach.name}</h3>
            <p className="mt-1 text-xs uppercase tracking-wide opacity-90">{coach.headline}</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star className="h-3.5 w-3.5 fill-current text-accent" /> {coach.rating}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {coach.subscribers.toLocaleString()}
            </span>
          </div>
          <span className="font-display text-base">
            {formatIdr(startingPrice)}<span className="text-xs">/mo</span>
          </span>
        </div>
      </article>
    </Link>
  );
};

export default CoachCard;
