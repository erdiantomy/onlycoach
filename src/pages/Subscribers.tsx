import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Search, Tag, StickyNote, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type EngagementFilter = "all" | "high" | "medium" | "low";

interface SubscriberRow {
  mentee_id: string;
  display_name: string | null;
  handle: string | null;
  tier_name: string | null;
  subscribed_at: string;
  status: string;
  tags: string[];
  note: string;
}

const AVAILABLE_TAGS = ["high-value", "at-risk", "new"];

const Subscribers = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [engagement] = useState<EngagementFilter>("all");
  const [openNote, setOpenNote] = useState<SubscriberRow | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const { data: rows = [], isLoading } = useQuery<SubscriberRow[]>({
    queryKey: ["subscribers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Fetch subscriptions for this coach
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("mentee_id, created_at, status, subscription_tiers(name), profiles!subscriptions_mentee_id_fkey(display_name, handle)")
        .eq("coach_id", user!.id)
        .eq("status", "active");
      if (error) throw error;

      const menteeIds = (subs ?? []).map((s) => s.mentee_id);

      // Fetch tags for all mentees
      const { data: tagRows } = menteeIds.length > 0
        ? await supabase.from("subscriber_tags").select("mentee_id, tag").eq("coach_id", user!.id).in("mentee_id", menteeIds)
        : { data: [] };

      // Fetch notes for all mentees
      const { data: noteRows } = menteeIds.length > 0
        ? await supabase.from("subscriber_notes").select("mentee_id, note").eq("coach_id", user!.id).in("mentee_id", menteeIds)
        : { data: [] };

      const tagsByMentee: Record<string, string[]> = {};
      for (const t of tagRows ?? []) {
        if (!tagsByMentee[t.mentee_id]) tagsByMentee[t.mentee_id] = [];
        tagsByMentee[t.mentee_id].push(t.tag);
      }
      const notesByMentee: Record<string, string> = {};
      for (const n of noteRows ?? []) {
        notesByMentee[n.mentee_id] = n.note;
      }

      return (subs ?? []).map((s) => {
        const p = s.profiles as unknown as { display_name: string | null; handle: string | null } | null;
        const t = s.subscription_tiers as unknown as { name: string } | null;
        return {
          mentee_id: s.mentee_id,
          display_name: p?.display_name ?? null,
          handle: p?.handle ?? null,
          tier_name: t?.name ?? null,
          subscribed_at: s.created_at,
          status: s.status,
          tags: tagsByMentee[s.mentee_id] ?? [],
          note: notesByMentee[s.mentee_id] ?? "",
        };
      });
    },
  });

  const toggleTagMutation = useMutation({
    mutationFn: async ({ menteeId, tag, active }: { menteeId: string; tag: string; active: boolean }) => {
      if (!user) throw new Error("Not signed in");
      if (active) {
        // Remove tag
        await supabase.from("subscriber_tags").delete()
          .eq("coach_id", user.id).eq("mentee_id", menteeId).eq("tag", tag);
      } else {
        // Add tag
        await supabase.from("subscriber_tags").insert({ coach_id: user.id, mentee_id: menteeId, tag });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscribers", user?.id] }),
    onError: () => toast.error("Couldn't update tag"),
  });

  const saveNote = async () => {
    if (!user || !openNote) return;
    setSavingNote(true);
    const { error } = await supabase.from("subscriber_notes").upsert({
      coach_id: user.id,
      mentee_id: openNote.mentee_id,
      note: noteDraft,
    }, { onConflict: "coach_id,mentee_id" });
    setSavingNote(false);
    if (error) {
      toast.error("Couldn't save note");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["subscribers", user?.id] });
    toast.success("Note saved");
    setOpenNote(null);
  };

  const tiers = useMemo(() => {
    const t = new Set(rows.map((r) => r.tier_name).filter(Boolean) as string[]);
    return ["all", ...Array.from(t)];
  }, [rows]);

  const filtered = useMemo(() => rows.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchQuery = !q || (s.display_name ?? "").toLowerCase().includes(q) || (s.handle ?? "").toLowerCase().includes(q);
    const matchTier = tierFilter === "all" || s.tier_name === tierFilter;
    return matchQuery && matchTier;
  }), [rows, query, tierFilter]);

  const exportCsv = () => {
    const header = ["Name", "Handle", "Tier", "Subscribed", "Status", "Tags"];
    const lines = filtered.map((r) => [
      r.display_name ?? "", r.handle ?? "", r.tier_name ?? "",
      new Date(r.subscribed_at).toLocaleDateString(), r.status, r.tags.join("|"),
    ].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported subscriber list");
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Studio
        </Link>

        <header className="mt-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="brutal-tag mb-3">Subscribers</span>
            <h1 className="font-display text-3xl md:text-5xl">
              {isLoading ? "…" : filtered.length} on the list
            </h1>
          </div>
          <Button onClick={exportCsv}
            className="border-2 border-ink bg-surface text-foreground shadow-brutal-sm hover:bg-accent/50">
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </header>

        <div className="brutal-card-sm mt-6 flex flex-col gap-3 p-3 md:flex-row md:items-center">
          <label className="flex flex-1 items-center gap-2 border-2 border-ink bg-surface px-3 py-2">
            <Search className="h-4 w-4" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subscribers"
              className="w-full bg-transparent text-sm focus:outline-none" />
          </label>
          <div className="flex gap-1 overflow-x-auto md:flex-wrap md:overflow-visible">
            {tiers.map((t) => (
              <button key={t} onClick={() => setTierFilter(t)} className={cn(
                "shrink-0 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                tierFilter === t ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
              )}>{t}</button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="brutal-card mt-6 p-8 text-center animate-pulse">
            <div className="h-6 w-48 bg-surface border-2 border-ink mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="brutal-card mt-6 p-10 text-center">
            <p className="font-display text-xl">{rows.length === 0 ? "No subscribers yet." : "No subscribers match."}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {rows.length === 0 ? "Share your profile to get your first subscriber." : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="brutal-card mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="border-b-2 border-ink px-4 py-3">Name</th>
                  <th className="border-b-2 border-ink px-4 py-3">Handle</th>
                  <th className="border-b-2 border-ink px-4 py-3">Tier</th>
                  <th className="border-b-2 border-ink px-4 py-3">Subscribed</th>
                  <th className="border-b-2 border-ink px-4 py-3">Tags</th>
                  <th className="border-b-2 border-ink px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.mentee_id} className="border-b-2 border-ink/10 last:border-0">
                    <td className="px-4 py-3 font-semibold">{s.display_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">@{s.handle ?? "—"}</td>
                    <td className="px-4 py-3">{s.tier_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(s.subscribed_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {AVAILABLE_TAGS.map((tag) => {
                          const active = s.tags.includes(tag);
                          return (
                            <button key={tag}
                              onClick={() => toggleTagMutation.mutate({ menteeId: s.mentee_id, tag, active })}
                              className={cn(
                                "inline-flex items-center gap-1 border-2 border-ink px-2 py-0.5 text-[10px] uppercase",
                                active ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
                              )}><Tag className="h-2.5 w-2.5" /> {tag}</button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setOpenNote(s); setNoteDraft(s.note); }}
                        className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground">
                        <StickyNote className="h-3.5 w-3.5" /> {s.note ? "Edit note" : "Note"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openNote && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 md:items-center"
          onClick={() => setOpenNote(null)}>
          <div className="brutal-card w-full max-w-md bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Note · {openNote.display_name ?? openNote.handle}</h3>
              <button onClick={() => setOpenNote(null)}><X className="h-5 w-5" /></button>
            </div>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Private notes only you can see…"
              className="mt-3 min-h-[120px] w-full resize-none border-2 border-ink bg-surface p-3 text-sm focus:outline-none"
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={saveNote} disabled={savingNote}
                className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
                {savingNote ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Subscribers;
