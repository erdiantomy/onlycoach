import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReviews } from "@/hooks/useReviews";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  coachId: string;
}

const RatingStars = ({
  value,
  size = "md",
  onChange,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  onChange?: (v: number) => void;
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const dim = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div role={onChange ? "radiogroup" : undefined} aria-label="Rating" className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (hover ?? value) >= n;
        return (
          <button
            key={n}
            type={onChange ? "button" : undefined}
            disabled={!onChange}
            onMouseEnter={() => onChange && setHover(n)}
            onMouseLeave={() => onChange && setHover(null)}
            onClick={() => onChange?.(n)}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            className={cn(
              "p-0.5 transition-transform",
              onChange ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default",
            )}
          >
            <Star
              className={cn(dim, active ? "fill-current text-accent" : "text-muted-foreground")}
              strokeWidth={2.25}
            />
          </button>
        );
      })}
    </div>
  );
};

export const ReviewSection = ({ coachId }: Props) => {
  const { user } = useSession();
  const { reviews, average, total, submit } = useReviews(coachId);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Pick a rating first");
      return;
    }
    submit(rating, body, user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "You");
    setRating(0);
    setBody("");
    toast.success("Review posted");
  };

  return (
    <section>
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl">Reviews</h2>
        {average !== null && (
          <div className="flex items-center gap-2 text-sm">
            <RatingStars value={Math.round(average)} size="sm" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">{average.toFixed(1)}</strong> · {total} review{total === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </header>

      {user && (
        <form onSubmit={onSubmit} className="brutal-card-sm mt-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Your rating</span>
            <RatingStars value={rating} size="lg" onChange={setRating} />
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What worked? What surprised you?"
            className="mt-3 min-h-[80px] w-full resize-none border-2 border-ink bg-surface p-3 text-sm focus:outline-none"
          />
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={rating < 1}
              className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
              Post review
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {reviews.length === 0 ? (
          <p className="brutal-card-sm p-5 text-sm text-muted-foreground">
            No reviews yet — be the first to share your experience.
          </p>
        ) : reviews.map((r) => (
          <article key={r.id} className="brutal-card-sm p-4">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <strong className="font-display text-base">{r.authorName}</strong>
                <RatingStars value={r.rating} size="sm" />
              </div>
              <time className="text-xs uppercase tracking-wide text-muted-foreground">
                {new Date(r.createdAt).toLocaleDateString()}
              </time>
            </header>
            {r.body && <p className="mt-2 text-sm">{r.body}</p>}
          </article>
        ))}
      </div>
    </section>
  );
};

export default ReviewSection;
