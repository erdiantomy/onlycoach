import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  messagesByConv as mockThreads,
  type Message,
} from "@/lib/mock";

interface RawMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * Live message thread for a single conversation. Subscribes to realtime
 * INSERTs on the messages table so new sends from either side render
 * immediately. Falls back to mock data when a conversationId points at
 * the mock store (so the UI still works in dev).
 */
export const useThread = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("id, conversation_id, sender_id, body, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        if (error) throw error;
        const rows = (data as unknown as RawMessage[] | null) ?? [];
        if (rows.length === 0 && mockThreads[conversationId]) {
          setMessages(mockThreads[conversationId]);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          setMessages(rows.map((r) => ({
            id: r.id,
            conversationId: r.conversation_id,
            fromCoach: !!user && r.sender_id !== user.id,
            body: r.body ?? "",
            at: formatTime(r.created_at),
          })));
        }
      } catch {
        if (!cancelled && mockThreads[conversationId]) {
          setMessages(mockThreads[conversationId]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    const channel = supabase
      .channel(`thread-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => { void load(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading };
};
