import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { conversations, messagesByConv, findCoach } from "@/lib/mock";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

const Messages = () => {
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const active = conversations.find((c) => c.id === activeId);
  const coach = active ? findCoach(active.coachId) : null;
  const thread = active ? messagesByConv[active.id] ?? [] : [];

  return (
    <AppShell>
      <div className="mx-auto grid h-[calc(100vh-8rem)] w-full max-w-6xl grid-cols-1 gap-0 px-0 md:grid-cols-[320px_1fr] md:gap-4 md:px-8 md:py-6">
        <aside className={cn("brutal-card-sm h-full overflow-y-auto rounded-none md:rounded-sm", active && "hidden md:block")}>
          <header className="border-b-2 border-ink bg-surface px-4 py-3">
            <h2 className="font-display text-lg">Messages</h2>
          </header>
          <ul>
            {conversations.map((conv) => {
              const c = findCoach(conv.coachId)!;
              return (
                <li key={conv.id}>
                  <button onClick={() => setActiveId(conv.id)} className={cn(
                    "flex w-full items-start gap-3 border-b-2 border-ink/20 px-4 py-3 text-left",
                    activeId === conv.id ? "bg-accent/40" : "hover:bg-surface",
                  )}>
                    <div className="h-10 w-10 shrink-0 border-2 border-ink bg-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm">{c.name}</span>
                        <span className="text-[10px] uppercase text-muted-foreground">{conv.lastAt}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center border-2 border-ink bg-accent px-1 text-[10px] font-bold">
                        {conv.unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className={cn("brutal-card-sm flex h-full flex-col rounded-none md:rounded-sm", !active && "hidden md:flex")}>
          {coach && active ? (
            <>
              <header className="flex items-center gap-3 border-b-2 border-ink bg-surface px-4 py-3">
                <button className="font-display text-xs uppercase md:hidden" onClick={() => setActiveId(null)}>← Back</button>
                <div className="h-9 w-9 border-2 border-ink bg-primary" />
                <div>
                  <div className="font-display text-sm">{coach.name}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">{coach.niche}</div>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-background p-4">
                {thread.map((m) => (
                  <div key={m.id} className={cn("flex", m.fromCoach ? "justify-start" : "justify-end")}>
                    <div className={cn("max-w-[80%] border-2 border-ink px-3 py-2 text-sm", m.fromCoach ? "bg-surface" : "bg-accent")}>
                      <p>{m.body}</p>
                      <div className="mt-1 text-right text-[10px] uppercase opacity-70">{m.at}</div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setDraft(""); }}
                className="flex items-center gap-2 border-t-2 border-ink bg-surface p-3">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…"
                  className="flex-1 border-2 border-ink bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none" />
                <button type="submit" aria-label="Send"
                  className="border-2 border-ink bg-ink p-2 text-ink-foreground shadow-brutal-sm">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">Select a conversation</div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export default Messages;
