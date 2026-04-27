import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { OfflineBoundary } from "@/components/OfflineBoundary";
import { useMessageOutbox } from "@/hooks/useMessageOutbox";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useConversations } from "@/hooks/useConversations";
import { useThread } from "@/hooks/useThread";
import { findCoach } from "@/lib/mock";
import { AlertCircle, Clock, Mic, RefreshCw, Send, Square, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceMessage {
  id: string;
  conversationId: string;
  url: string;
  durationMs: number;
  at: string;
}

const formatTime = (ms: number) => {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const Messages = () => {
  // Optional URL param — deep links from push notifications navigate to
  // /messages/:conversationId so the right thread opens automatically.
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { conversations } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(
    conversationId ?? null,
  );
  const [draft, setDraft] = useState("");
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const voice = useVoiceRecorder();

  // React to URL changes (e.g. notification tapped while app already open).
  useEffect(() => {
    if (conversationId && conversationId !== activeId) setActiveId(conversationId);
  }, [conversationId, activeId]);

  // Default to the first conversation once the list lands, if no URL hint.
  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [activeId, conversations]);

  const active = conversations.find((c) => c.id === activeId);
  const coach = active ? findCoach(active.coachId) : null;
  const { messages: thread } = useThread(activeId);

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

  const handleVoiceToggle = async () => {
    if (voice.status === "unsupported") {
      toast.error("Voice notes need a microphone-capable browser.");
      return;
    }
    if (voice.status === "recording") {
      voice.stop();
    } else {
      await voice.start();
    }
  };

  const sendVoice = () => {
    if (!voice.clip || !activeId) return;
    setVoiceMessages((prev) => [
      ...prev,
      {
        id: `vm_${Date.now()}`,
        conversationId: activeId,
        url: voice.clip!.url,
        durationMs: voice.clip!.durationMs,
        at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    voice.reset();
    toast.success("Voice note sent");
  };

  const activeVoice = voiceMessages.filter((v) => v.conversationId === activeId);

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
                  {/* Voice notes the user has sent in this conversation. */}
                  {activeVoice.map((v) => (
                    <div key={v.id} className="flex justify-end">
                      <div className="max-w-[80%] border-2 border-ink bg-accent px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mic className="h-3.5 w-3.5" aria-hidden />
                          <audio controls src={v.url} className="h-8" />
                        </div>
                        <div className="mt-1 text-right text-[10px] uppercase opacity-70">
                          {formatTime(v.durationMs)} · {v.at}
                        </div>
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

                {voice.status === "recording" && (
                  <div className="flex items-center justify-between gap-3 border-t-2 border-ink bg-destructive/10 px-4 py-2 text-sm">
                    <span className="inline-flex items-center gap-2 font-mono">
                      <span aria-hidden className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                      Recording · {formatTime(voice.durationMs)}
                    </span>
                    <button
                      type="button"
                      onClick={voice.stop}
                      className="inline-flex items-center gap-1 border-2 border-ink bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                      <Square className="h-3 w-3" /> Stop
                    </button>
                  </div>
                )}
                {voice.status === "stopped" && voice.clip && (
                  <div className="flex flex-wrap items-center gap-2 border-t-2 border-ink bg-accent/30 px-3 py-2 text-sm">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Voice note · {formatTime(voice.clip.durationMs)}
                    </span>
                    <audio controls src={voice.clip.url} className="h-8 flex-1 min-w-[140px]" />
                    <button type="button" onClick={voice.reset} aria-label="Discard voice note"
                      className="border-2 border-ink bg-surface p-1.5 hover:bg-destructive/20">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={sendVoice}
                      className="inline-flex items-center gap-1 border-2 border-ink bg-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-foreground shadow-brutal-sm">
                      <Send className="h-3 w-3" /> Send
                    </button>
                  </div>
                )}
                {voice.status === "denied" && (
                  <div className="flex items-center justify-between gap-2 border-t-2 border-ink bg-destructive/10 px-4 py-2 text-xs">
                    <span className="text-destructive">Microphone access denied. Update site permissions to record.</span>
                    <button type="button" onClick={voice.reset} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit}
                  className="flex items-center gap-2 border-t-2 border-ink bg-surface p-3">
                  <button
                    type="button"
                    onClick={handleVoiceToggle}
                    aria-label={voice.status === "recording" ? "Stop recording" : "Record voice note"}
                    aria-pressed={voice.status === "recording"}
                    disabled={voice.status === "unsupported"}
                    className={cn(
                      "border-2 border-ink p-2 shadow-brutal-sm disabled:opacity-40",
                      voice.status === "recording" ? "bg-destructive text-destructive-foreground" : "bg-surface",
                    )}
                  >
                    {voice.status === "recording" ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
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
