import { Link } from "react-router-dom";
import { Users } from "lucide-react";

interface MenteeCardProps {
  mentee: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
    follower_count?: number;
    badge_count?: number;
  };
}

export const MenteeCard = ({ mentee }: MenteeCardProps) => (
  <Link to={`/mentee/${mentee.handle}`} className="group block">
    <article className="brutal-card-sm p-4 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 border-2 border-ink bg-accent overflow-hidden">
          {mentee.avatar_url && (
            <img
              src={mentee.avatar_url}
              alt={mentee.display_name}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg leading-tight group-hover:underline">
            {mentee.display_name}
          </p>
          <p className="truncate text-xs text-muted-foreground">@{mentee.handle}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
        <div className="flex items-center gap-3">
          {typeof mentee.badge_count === "number" && (
            <span>🏆×{mentee.badge_count}</span>
          )}
          {typeof mentee.follower_count === "number" && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {mentee.follower_count}
            </span>
          )}
        </div>
        <span className="brutal-tag text-[10px]">View profile</span>
      </div>
    </article>
  </Link>
);

export default MenteeCard;
