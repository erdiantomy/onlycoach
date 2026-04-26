import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { challenges, findCoach } from "@/lib/mock";
import NotFound from "./NotFound";
import { Button } from "@/components/ui/button";
import { Calendar, Users, ArrowLeft, Lock, FileText, Video, Headphones, ClipboardList } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

const lessonIcon = {
  text: FileText,
  video: Video,
  audio: Headphones,
  assignment: ClipboardList,
} as const;

const ChallengeDetail = () => {
  const { id } = useParams();
  const { user } = useSession();
  const [enrolled, setEnrolled] = useState(false);
  const challenge = useMemo(() => challenges.find((c) => c.id === id), [id]);
  if (!challenge) return <NotFound />;

  const coach = findCoach(challenge.coachId);
  const fillPct = Math.min(100, Math.round((challenge.enrolled / challenge.maxParticipants) * 100));

  const enroll = () => {
    if (!user) {
      toast.error("Sign in to enroll");
      return;
    }
    setEnrolled(true);
    toast.success(`You're in — ${challenge.title} starts soon`);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/challenges" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> All challenges
        </Link>

        <header className="mt-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="brutal-tag">{challenge.status}</span>
            <h1 className="mt-2 font-display text-3xl md:text-5xl">{challenge.title}</h1>
            {coach && (
              <Link to={`/coach/${coach.handle}`} className="mt-2 inline-block text-sm text-muted-foreground hover:underline">
                Hosted by {coach.name}
              </Link>
            )}
          </div>
          <div className="font-display text-3xl">${challenge.price}</div>
        </header>

        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <p className="text-foreground">{challenge.description}</p>

            <section className="brutal-card-sm p-5">
              <h2 className="font-display text-xl">What's included</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {challenge.durationDays} days of programming</li>
                <li className="flex items-center gap-2"><Users className="h-4 w-4" /> Cohort of {challenge.enrolled} so far</li>
                <li className="flex items-center gap-2"><FileText className="h-4 w-4" /> Daily lesson + community access</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl">Curriculum preview</h2>
              <div className="mt-4 space-y-3">
                {challenge.curriculum.map((lesson) => {
                  const Icon = lessonIcon[lesson.type];
                  const isLocked = !enrolled && lesson.day > 1;
                  return (
                    <article key={lesson.day} className="brutal-card-sm flex items-start gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-surface font-display">
                        {lesson.day}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" /> {lesson.type}
                          {isLocked && <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Locked</span>}
                        </div>
                        <h3 className="mt-1 font-display text-lg">{lesson.title}</h3>
                        {lesson.preview && !isLocked && (
                          <p className="mt-1 text-sm text-muted-foreground">{lesson.preview}</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="md:sticky md:top-24 md:self-start">
            <div className="brutal-card p-5">
              <h3 className="font-display text-xl">Join this cohort</h3>
              <p className="mt-1 text-xs text-muted-foreground">{challenge.startsIn}</p>
              <div className="mt-4 h-1.5 w-full border-2 border-ink bg-surface">
                <div className="h-full bg-primary" style={{ width: `${fillPct}%` }} />
              </div>
              <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                {challenge.enrolled}/{challenge.maxParticipants} enrolled
              </p>

              <Button
                onClick={enroll}
                disabled={enrolled}
                className="mt-4 w-full border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90"
              >
                {enrolled ? "Enrolled — see you Day 1" : `Enroll — $${challenge.price}`}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
};

export default ChallengeDetail;
