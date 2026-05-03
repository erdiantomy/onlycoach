import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Calendar, Users, ArrowLeft, Lock, FileText, Video, Headphones, ClipboardList } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NotFound from "./NotFound";

const lessonIcon = {
  text: FileText,
  video: Video,
  audio: Headphones,
  assignment: ClipboardList,
} as const;

interface ChallengeRow {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  duration_days: number;
  max_participants: number | null;
  starts_at: string | null;
  status: string;
  coach_name: string | null;
  coach_handle: string | null;
  enrollment_count: number;
}

interface CurriculumRow {
  id: string;
  day_number: number;
  title: string;
  body: string | null;
  lesson_type: string;
}

const ChallengeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState(false);

  const { data: challenge, isLoading: loadingChallenge } = useQuery<ChallengeRow | null>({
    queryKey: ["challenge", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, coach_id, title, description, price_cents, duration_days, max_participants, starts_at, status, profiles!challenges_coach_id_fkey(display_name, handle)")
        .eq("id", id!)
        .single();
      if (error) return null;
      const p = data.profiles as unknown as { display_name: string | null; handle: string | null } | null;

      // Count enrollments
      const { count } = await supabase
        .from("challenge_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("challenge_id", id!);

      return {
        id: data.id,
        coach_id: data.coach_id,
        title: data.title,
        description: data.description,
        price_cents: data.price_cents,
        duration_days: data.duration_days,
        max_participants: data.max_participants,
        starts_at: data.starts_at,
        status: data.status,
        coach_name: p?.display_name ?? null,
        coach_handle: p?.handle ?? null,
        enrollment_count: count ?? 0,
      };
    },
  });

  const { data: curriculum = [] } = useQuery<CurriculumRow[]>({
    queryKey: ["challenge-curriculum", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_curriculum")
        .select("id, day_number, title, body, lesson_type")
        .eq("challenge_id", id!)
        .order("day_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: enrolled = false } = useQuery<boolean>({
    queryKey: ["challenge-enrolled", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("challenge_enrollments")
        .select("id")
        .eq("challenge_id", id!)
        .eq("mentee_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Not signed in");
      const { error } = await supabase.from("challenge_enrollments").insert({
        challenge_id: id,
        mentee_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-enrolled", id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["challenge", id] });
      toast.success(`You're in — see you Day 1!`);
    },
    onError: (err: Error) => {
      if (err.message?.includes("unique")) {
        toast.info("You're already enrolled in this challenge");
      } else {
        toast.error("Couldn't enroll — try again");
      }
    },
  });

  const enroll = async () => {
    if (!user) {
      toast.error("Sign in to enroll");
      return;
    }
    setEnrolling(true);
    try {
      await enrollMutation.mutateAsync();
    } finally {
      setEnrolling(false);
    }
  };

  if (loadingChallenge) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-surface border-2 border-ink" />
            <div className="h-40 w-full bg-surface border-2 border-ink" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!challenge) return <NotFound />;

  const maxP = challenge.max_participants ?? 999;
  const fillPct = Math.min(100, Math.round((challenge.enrollment_count / Math.max(maxP, 1)) * 100));
  const priceDollars = challenge.price_cents / 100;

  const startsIn = challenge.starts_at
    ? new Date(challenge.starts_at).toLocaleDateString()
    : "Open enrollment";

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
            {challenge.coach_handle && (
              <Link to={`/coach/${challenge.coach_handle}`} className="mt-2 inline-block text-sm text-muted-foreground hover:underline">
                Hosted by {challenge.coach_name ?? challenge.coach_handle}
              </Link>
            )}
          </div>
          <div className="font-display text-2xl">{formatIdr(priceDollars)}</div>
        </header>

        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <p className="text-foreground">{challenge.description}</p>

            <section className="brutal-card-sm p-5">
              <h2 className="font-display text-xl">What's included</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {challenge.duration_days} days of programming</li>
                <li className="flex items-center gap-2"><Users className="h-4 w-4" /> Cohort of {challenge.enrollment_count} so far</li>
                <li className="flex items-center gap-2"><FileText className="h-4 w-4" /> Daily lesson + community access</li>
              </ul>
            </section>

            {curriculum.length > 0 && (
              <section>
                <h2 className="font-display text-2xl">Curriculum preview</h2>
                <div className="mt-4 space-y-3">
                  {curriculum.map((lesson) => {
                    const type = lesson.lesson_type as keyof typeof lessonIcon;
                    const Icon = lessonIcon[type] ?? FileText;
                    const isLocked = !enrolled && lesson.day_number > 1;
                    return (
                      <article key={lesson.id} className="brutal-card-sm flex items-start gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-surface font-display">
                          {lesson.day_number}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" /> {lesson.lesson_type}
                            {isLocked && <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Locked</span>}
                          </div>
                          <h3 className="mt-1 font-display text-lg">{lesson.title}</h3>
                          {lesson.body && !isLocked && (
                            <p className="mt-1 text-sm text-muted-foreground">{lesson.body}</p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <aside className="md:sticky md:top-24 md:self-start">
            <div className="brutal-card p-5">
              <h3 className="font-display text-xl">Join this cohort</h3>
              <p className="mt-1 text-xs text-muted-foreground">{startsIn}</p>
              {challenge.max_participants && (
                <>
                  <div className="mt-4 h-1.5 w-full border-2 border-ink bg-surface">
                    <div className="h-full bg-primary" style={{ width: `${fillPct}%` }} />
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {challenge.enrollment_count}/{challenge.max_participants} enrolled
                  </p>
                </>
              )}

              <Button
                onClick={enroll}
                disabled={enrolled || enrolling}
                className="mt-4 w-full border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90"
              >
                {enrolled
                  ? "Enrolled — see you Day 1"
                  : enrolling
                    ? "Enrolling…"
                    : `Enroll — ${formatIdr(priceDollars)}`}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
};

export default ChallengeDetail;
