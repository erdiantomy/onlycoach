import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { challenges as seedChallenges, coaches, type Challenge, type ChallengeLesson } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Trophy, X } from "lucide-react";
import { cn, formatIdr } from "@/lib/utils";
import { toast } from "sonner";

interface DraftLesson {
  day: number;
  title: string;
  type: ChallengeLesson["type"];
}

const StudioChallenges = () => {
  const me = coaches[0];
  const [items, setItems] = useState<Challenge[]>(() => seedChallenges.filter((c) => c.coachId === me.id));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    price: 99,
    durationDays: 14,
    maxParticipants: 100,
  });
  const [lessons, setLessons] = useState<DraftLesson[]>([
    { day: 1, title: "", type: "text" },
  ]);

  const addLesson = () => {
    setLessons((prev) => [...prev, { day: prev.length + 1, title: "", type: "text" }]);
  };

  const removeLesson = (day: number) => {
    setLessons((prev) => prev.filter((l) => l.day !== day).map((l, i) => ({ ...l, day: i + 1 })));
  };

  const publish = () => {
    if (!draft.title.trim() || !draft.description.trim()) {
      toast.error("Add a title and description");
      return;
    }
    if (lessons.some((l) => !l.title.trim())) {
      toast.error("Each lesson needs a title");
      return;
    }
    const next: Challenge = {
      id: `ch_${Date.now()}`,
      coachId: me.id,
      title: draft.title.trim(),
      description: draft.description.trim(),
      price: draft.price,
      durationDays: draft.durationDays,
      enrolled: 0,
      maxParticipants: draft.maxParticipants,
      startsIn: "Draft",
      status: "open",
      curriculum: lessons.map((l) => ({ day: l.day, title: l.title.trim(), type: l.type })),
    };
    setItems((prev) => [next, ...prev]);
    toast.success("Challenge published");
    setOpen(false);
    setDraft({ title: "", description: "", price: 99, durationDays: 14, maxParticipants: 100 });
    setLessons([{ day: 1, title: "", type: "text" }]);
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
    toast.success("Challenge deleted");
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Studio
        </Link>

        <header className="mt-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="brutal-tag mb-3"><Trophy className="h-3 w-3" /> My challenges</span>
            <h1 className="font-display text-3xl md:text-5xl">{items.length} cohort{items.length === 1 ? "" : "s"}</h1>
          </div>
          <Button onClick={() => setOpen(true)}
            className="border-2 border-ink bg-accent text-ink shadow-brutal-sm hover:bg-accent/90">
            <Plus className="mr-1.5 h-4 w-4" /> New challenge
          </Button>
        </header>

        {items.length === 0 ? (
          <div className="brutal-card mt-6 p-10 text-center">
            <p className="font-display text-xl">No challenges yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Launch a 14- or 30-day cohort to give subscribers structure.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((c) => (
              <article key={c.id} className="brutal-card-sm flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="brutal-tag">{c.status}</span>
                    <h2 className="font-display text-xl">{c.title}</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                    <span>{c.durationDays}d</span>
                    <span>{c.enrolled}/{c.maxParticipants} enrolled</span>
                    <span>{formatIdr(c.price)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" className="border-2 border-ink bg-surface">
                    <Link to={`/challenges/${c.id}`}>View</Link>
                  </Button>
                  <button onClick={() => remove(c.id)}
                    className="border-2 border-ink bg-destructive/10 px-3 text-destructive hover:bg-destructive/20">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 md:items-center"
          onClick={() => setOpen(false)}>
          <div className="brutal-card max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-surface p-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">New challenge</h3>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Title">
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. 30-Day Strength Reset"
                  className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
              </Field>
              <Field label="Description">
                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="What will participants get?"
                  className="min-h-[80px] w-full resize-none border-2 border-ink bg-surface p-3 text-sm focus:outline-none" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Price">
                  <input type="number" min={0} value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                    className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
                  <p className="mt-1 text-xs text-muted-foreground">{formatIdr(draft.price)}</p>
                </Field>
                <Field label="Duration (days)">
                  <input type="number" min={1} value={draft.durationDays}
                    onChange={(e) => setDraft({ ...draft, durationDays: Number(e.target.value) })}
                    className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
                </Field>
                <Field label="Max participants">
                  <input type="number" min={1} value={draft.maxParticipants}
                    onChange={(e) => setDraft({ ...draft, maxParticipants: Number(e.target.value) })}
                    className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
                </Field>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Curriculum</label>
                  <button onClick={addLesson}
                    className="inline-flex items-center gap-1 border-2 border-ink bg-surface px-2 py-1 text-xs uppercase">
                    <Plus className="h-3 w-3" /> Lesson
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {lessons.map((l) => (
                    <div key={l.day} className="flex items-center gap-2">
                      <span className="border-2 border-ink bg-surface px-2 py-2 text-xs font-bold">{l.day}</span>
                      <input value={l.title} onChange={(e) => setLessons((prev) =>
                          prev.map((x) => x.day === l.day ? { ...x, title: e.target.value } : x))}
                        placeholder="Lesson title"
                        className="flex-1 border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
                      <select value={l.type} onChange={(e) => setLessons((prev) =>
                          prev.map((x) => x.day === l.day ? { ...x, type: e.target.value as DraftLesson["type"] } : x))}
                        className="border-2 border-ink bg-surface px-2 py-2 text-xs focus:outline-none">
                        <option value="text">text</option>
                        <option value="video">video</option>
                        <option value="audio">audio</option>
                        <option value="assignment">assignment</option>
                      </select>
                      {lessons.length > 1 && (
                        <button onClick={() => removeLesson(l.day)}
                          className="border-2 border-ink bg-destructive/10 px-2 py-2 text-destructive hover:bg-destructive/20">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}
                className="border-2 border-ink bg-surface">Cancel</Button>
              <Button onClick={publish}
                className={cn("border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90")}>
                Publish
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

export default StudioChallenges;
