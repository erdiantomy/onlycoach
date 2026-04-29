import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { OfflineBoundary } from "@/components/OfflineBoundary";
import { useMessageOutbox } from "@/hooks/useMessageOutbox";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Clock, RefreshCw, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ConvRow = {
  id: string;
  coach_id: string;
  last_message_at: string;
  coach_display_name: string;
  coach_handle: string;
};

type MsgRow = {
  id: string;
  body: string | null;
  sender_id: string;
  created_at: string;
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const Messages = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(
    conversationId ?? null,
  );
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId && conversationId !== activeId)
      setActiveId(conversationId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ConvRow[]> => {
      const convsRes = await supabase
        .from("conversations")
        .select("*")
        .eq("mentee_id", user!.id)
        .order("last_message_at", { ascending: false });

      const convs = convsRes.data ?? [];
      if (convs.length === 0) return [];

      const coachIds = [...new Set(convs.map((c) => c.coach_id))];
      const profilesRes = await supabase
        .from("profiles")
        .select("id, display_name, handle")
        .in("id", coachIds);

      const pm = new Map(
        (profilesRes.data ?? []).map((p) => [p.id, p]),
      );

      return convs.map((c) => ({
        id: c.id,
        coach_id: c.coach_id,
        last_message_at: c.last_message_at,
        coach_display_name: pm.get(c.coach_id)?.display_name ?? "Coach",
        coach_handle: pm.get(c.coach_id)?.handle ?? "",
      }));
    },
  });

  useEffect(() => {
    if (!activeId && conversations.length > 0)
      setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const { data: thread = [] } = useQuery({
    queryKey: ["messages", activeId],
    enabled: !!activeId,
    queryFn: async (): Promise<MsgRow[]> => {
      const res = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at")
        .eq("conversation_id", activeId!)
        .order("created_at", { ascending: true });
      return res.data ?? [];
    },
  });

  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          queryClient.setQueryData<MsgRow[]>(
            ["messages", activeId],
            (old = []) => [...old, payload.new as MsgRow],
          );
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [thread.length, activeId]);

  const { online } = useOnlineStatus();
  const { forConversation: outbox, enqueue, remove, flush } =
    useMessageOutbox(activeId);

  const sendOne = async (item: {
    id: string;
    conversationId: string;
    body: string;
  }) => {
    if (!online || !user) return false;
    const { error } = await supabase.from("messages").insert({
      conversation_id: item.conversationId,
      sender_id: user.id,
      body: item.body,
    });
    if (error) {
      toast.error("Failed to send message");
      return false;
    }
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", item.conversationId);
    return true;
  };

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
    if (online) flush(sendOne);
  };

  const active = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <AppShell>
      <OfflineBoundary>
        <div className="mx-auto grid h-[calc(100vh-8rem)] w-full max-w-6xl grid-cols-1 gap-0 px-0 md:grid-cols-[320px_1fr] md:gap-4 md:px-8 md:py-6">
          <aside className={cn("brutal-card-sm h-full overflow-y-auto rounded-none md:rounded-sm", active && "hidden md:block")}>
            <header className="border-b-2 border-ink bg-surface px-4 py-3">
              <h2 className="font-display text-lg">Messages</h2>
            </header>
            {conversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              <ul>
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <button
                      onClick={() => setActiveId(conv.id)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b-2 border-ink/20 px-4 py-3 text-left",
                        activeId === conv.id ? "bg-accent/40" : "hover:bg-surface",
                      )}
                    >
                      <div className="h-10 w-10 shrink-0 border-2 border-ink bg-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-sm">{conv.coach_display_name}</span>
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {timeLabel(conv.last_message_at)}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className={cn("brutal-card-sm flex h-full flex-col rounded-none md:rounded-sm", !active && "hidden md:flex")}>
            {active ? (
              <>
                <header className="flex items-center gap-3 border-b-2 border-ink bg-surface px-4 py-3">
                  <button className="font-display text-xs uppercase md:hidden" onClick={() => setActiveId(null)}>← Back</button>
                  <div className="h-9 w-9 border-2 border-ink bg-primary" />
                  <div>
                    <div className="font-display text-sm">{active.coach_display_name}</div>
                  </div>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto bg-background p-4">
                  {thread.map((m) => {
                    const fromCoach = m.sender_id !== user?.id;
                    return (
                      <div key={m.id} className={cn("flex", fromCoach ? "justify-start" : "justify-end")}>
                        <div className={cn("max-w-[80%] border-2 border-ink px-3 py-2 text-sm", fromCoach ? "bg-surface" : "bg-accent")}>
                          <p>{m.body}</p>
                          <div className="mt-1 text-right text-[10px] uppercase opacity-70">{timeLabel(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                  {outbox.map((item) => (
                    <div key={item.id} className="flex justify-end">
                      <div className={cn("max-w-[80%] border-2 border-ink px-3 py-2 text-sm", item.status === "failed" ? "bg-destructive/20" : "bg-accent/60 opacity-80")}>
                        <p>{item.body}</p>
                        <div className="mt-1 flex items-center justify-end gap-2 text-[10px] uppercase opacity-80">
                          {item.status === "failed" ? (
                            <>
                              <AlertCircle className="h-3 w-3" aria-hidden />
                              <span>{item.lastError ?? "Failed"}</span>
                              <button type="button" onClick={() => flush(sendOne)} className="inline-flex items-center gap-1 underline">
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
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t-2 border-ink bg-surface p-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={online ? "Write a message…" : "Offline — message will queue"}
                    className="flex-1 border-2 border-ink bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                  />
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
