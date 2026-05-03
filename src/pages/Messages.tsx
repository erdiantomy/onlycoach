import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { OfflineBoundary } from "@/components/OfflineBoundary";
import { useMessageOutbox } from "@/hooks/useMessageOutbox";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { conversations, messagesByConv, findCoach } from "@/lib/mock";
import { AlertCircle, Clock, RefreshCw, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";

const Messages = () => {
  usePageTitle("Messages");
  // Optional URL param — deep links from push notifications navigate to
  // /messages/:conversationId so the right thread opens automatically.
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [activeId, setActiveId] = useState<string | null>(
    conversationId ?? conversations[0]?.id ?? null,
  );
  const [draft, setDraft] = useState("");

  // React to URL changes (e.g. notification tapped while app already open).
  useEffect(() => {
    if (conversationId && conversationId !== activeId) setActiveId(conversationId);
  }, [conversationId, activeId]);

  const active = conversations.find((c) => c.id === activeId);
  const coach = active ? findCoach(active.coachId) : null;
  const thread = active ? messagesByConv[active.id] ?? [] : [];

  // Network + outbox: messages typed offline are queued safely and flushed
  // when the connection comes back. Children always render so chat history
  // stays readable while the banner shows status.
  const { online } = useOnlineStatus();
  const { forConversation: outbox, enqueue, remove, flush } = useMessageOutbox(activeId);

  // Stub sender — real implementation would call supabase.from('messages').insert(...)
  // and return true on success. Keeping it isolated means swapping the
  // backend later doesn't touch the UI/queue logic.
  const sendOne = async (item: { id: string; conversationId: string; body: string }) => {
    if (!online) return false;
    // TODO: replace with real supabase insert once chat is on real data.
    await new Promise((r) => setTimeout(r, 250));
    return true;
  };

  // Auto-flush whenever connectivity returns OR a new item lands.
  useEffect(() => {
    if (!online || outbox.length === 0) return;
    flush(sendOne);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, outbox.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeId) return;
    enqueue(draft);
    setDraft("");
    // Try immediately if online — if not, item stays queued.
    if (online) flush(sendOne);
  };

  return (
    <AppShell>
      <OfflineBoundary>
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
                  {/* Pending / failed outgoing messages — visible to user as their own bubbles with state. */}
                  {outbox.map((item) => (
                    <div key={item.id} className="flex justify-end">
                      <div className={cn(
                        "max-w-[80%] border-2 border-ink px-3 py-2 text-sm",
                        item.status === "failed" ? "bg-destructive/20" : "bg-accent/60 opacity-80",
                      )}>
                        <p>{item.body}</p>
                        <div className="mt-1 flex items-center justify-end gap-2 text-[10px] uppercase opacity-80">
                          {item.status === "failed" ? (
                            <>
                              <AlertCircle className="h-3 w-3" aria-hidden />
                              <span>{item.lastError ?? "Failed"}</span>
                              <button
                                type="button"
                                onClick={() => flush(sendOne)}
                                className="inline-flex items-center gap-1 underline"
                              >
                                <RefreshCw className="h-3 w-3" /> Retry
                              </button>
                              <button type="button" onClick={() => remove(item.id)} className="underline">Discard</button>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" aria-hidden />
                              <span>{online ? "Sending…" : "Queued — offline"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSubmit}
                  className="flex items-center gap-2 border-t-2 border-ink bg-surface p-3">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={online ? "Write a message…" : "Offline — message will queue"}
                    className="flex-1 border-2 border-ink bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none" />
                  <button type="submit" aria-label="Send" disabled={!draft.trim()}
                    className="border-2 border-ink bg-ink p-2 text-ink-foreground shadow-brutal-sm disabled:opacity-50">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">Select a conversation</div>
            )}
          </section>
        </div>
      </OfflineBoundary>
    </AppShell>
  );
};

export default Messages;
