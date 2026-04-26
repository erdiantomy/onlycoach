import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { coaches, subscribers, type SubscriberRow } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Search, Tag, StickyNote, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type EngagementFilter = "all" | "high" | "medium" | "low";

const Subscribers = () => {
  const me = coaches[0];
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<string>("all");
  const [engagement, setEngagement] = useState<EngagementFilter>("all");
  const [openNote, setOpenNote] = useState<SubscriberRow | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<Record<string, string[]>>(
    Object.fromEntries(subscribers.map((s) => [s.id, s.tags])),
  );

  const tiers = ["all", ...me.tiers.map((t) => t.name)];

  const rows = useMemo(() => subscribers.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchQuery = !q || s.name.toLowerCase().includes(q) || s.tier.toLowerCase().includes(q);
    const matchTier = tier === "all" || s.tier === tier;
    const matchEng = engagement === "all" || s.engagement === engagement;
    return matchQuery && matchTier && matchEng;
  }), [query, tier, engagement]);

  const exportCsv = () => {
    const header = ["Name", "Tier", "Joined", "Last active", "Engagement", "Tags"];
    const lines = rows.map((r) => [r.name, r.tier, r.joined, r.lastActive, r.engagement, (tags[r.id] ?? []).join("|")].join(","));
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

  const toggleTag = (id: string, tag: string) => {
    setTags((prev) => {
      const current = prev[id] ?? [];
      const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
      return { ...prev, [id]: next };
    });
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
            <h1 className="font-display text-3xl md:text-5xl">{rows.length} on the list</h1>
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
              <button key={t} onClick={() => setTier(t)} className={cn(
                "shrink-0 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                tier === t ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
              )}>{t}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["all", "high", "medium", "low"] as EngagementFilter[]).map((e) => (
              <button key={e} onClick={() => setEngagement(e)} className={cn(
                "shrink-0 border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                engagement === e ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
              )}>{e}</button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="brutal-card mt-6 p-10 text-center">
            <p className="font-display text-xl">No subscribers match.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="brutal-card mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="border-b-2 border-ink px-4 py-3">Name</th>
                  <th className="border-b-2 border-ink px-4 py-3">Tier</th>
                  <th className="border-b-2 border-ink px-4 py-3">Joined</th>
                  <th className="border-b-2 border-ink px-4 py-3">Last active</th>
                  <th className="border-b-2 border-ink px-4 py-3">Engagement</th>
                  <th className="border-b-2 border-ink px-4 py-3">Tags</th>
                  <th className="border-b-2 border-ink px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b-2 border-ink/10 last:border-0">
                    <td className="px-4 py-3 font-semibold">{s.name}</td>
                    <td className="px-4 py-3">{s.tier}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.joined}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.lastActive}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "border-2 border-ink px-2 py-0.5 text-xs uppercase",
                        s.engagement === "high" && "bg-primary/20",
                        s.engagement === "medium" && "bg-accent/30",
                        s.engagement === "low" && "bg-destructive/10 text-destructive",
                      )}>{s.engagement}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {["high-value", "at-risk", "new"].map((tag) => {
                          const active = (tags[s.id] ?? []).includes(tag);
                          return (
                            <button key={tag} onClick={() => toggleTag(s.id, tag)} className={cn(
                              "inline-flex items-center gap-1 border-2 border-ink px-2 py-0.5 text-[10px] uppercase",
                              active ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
                            )}><Tag className="h-2.5 w-2.5" /> {tag}</button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setOpenNote(s)} className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground">
                        <StickyNote className="h-3.5 w-3.5" /> Note
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
              <h3 className="font-display text-xl">Note · {openNote.name}</h3>
              <button onClick={() => setOpenNote(null)}><X className="h-5 w-5" /></button>
            </div>
            <textarea
              value={notes[openNote.id] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [openNote.id]: e.target.value }))}
              placeholder="Private notes only you can see…"
              className="mt-3 min-h-[120px] w-full resize-none border-2 border-ink bg-surface p-3 text-sm focus:outline-none"
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={() => { toast.success("Note saved"); setOpenNote(null); }}
                className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Subscribers;
