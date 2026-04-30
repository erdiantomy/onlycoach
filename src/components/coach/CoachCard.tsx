import { Link } from "react-router-dom";
import { Star, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface CoachCardData {
  user_id: string;
  niche: string;
  rating: number;
  subscriber_count: number;
  lowestPriceCents: number | null;
  profiles: {
    handle: string;
    display_name: string;
    avatar_url: string | null;
    headline: string | null;
  } | null;
}

function formatIdrCents(cents: number): string {
  const idr = Math.round(cents / 100);
  return `Rp${idr.toLocaleString("id-ID")}`;
}

export const CoachCard = ({ coach }: { coach: CoachCardData }) => {
  const profile = coach.profiles;
  if (!profile) return null;

  const initials = profile.display_name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Link to={`/coach/${profile.handle}`} className="group block">
      <article className="brutal-card-sm overflow-hidden transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5">
        <div className="relative aspect-[4/5] border-b-2 border-ink bg-primary overflow-hidden">
          <Avatar className="h-full w-full rounded-none">
            <AvatarImage
              src={profile.avatar_url ?? undefined}
              alt={profile.display_name}
              className="object-cover"
            />
            <AvatarFallback className="rounded-none bg-primary text-primary-foreground font-display text-4xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/40" />
          <span className="brutal-tag absolute left-3 top-3 bg-surface">{coach.niche}</span>
          <div className="absolute bottom-3 left-3 right-3 text-primary-foreground">
            <h3 className="font-display text-2xl leading-none">{profile.display_name}</h3>
            {profile.headline && (
              <p className="mt-1 text-xs uppercase tracking-wide opacity-90">{profile.headline}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star className="h-3.5 w-3.5 fill-current text-accent" /> {coach.rating.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {coach.subscriber_count.toLocaleString()}
            </span>
          </div>
          {coach.lowestPriceCents !== null ? (
            <span className="font-display text-base">
              {formatIdrCents(coach.lowestPriceCents)}<span className="text-xs">/mo</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Free</span>
          )}
        </div>
      </article>
    </Link>
  );
};

export default CoachCard;
