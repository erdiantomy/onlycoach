import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  conversations as mockConversations,
  type Conversation,
} from "@/lib/mock";

interface RawConversationRow {
  id: string;
  coach_id: string;
  mentee_id: string;
  last_message_at: string;
}

const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
};

/**
 * Fetch the current user's conversations from Supabase. Realtime sub
 * keeps the list ordered by last_message_at as new messages arrive.
 *
 * Returns the existing mock Conversation shape so Messages.tsx renders
 * without rework. Falls back to mock data on error or empty result.
 */
export const useConversations = () => {
  const [items, setItems] = useState<Conversation[]>(mockConversations);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "mock">("mock");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("conversations")
          .select("id, coach_id, mentee_id, last_message_at")
          .order("last_message_at", { ascending: false })
          .limit(100);
        if (cancelled) return;
        if (error) throw error;
        const rows = (data as unknown as RawConversationRow[] | null) ?? [];
        if (rows.length === 0) {
          setItems(mockConversations);
          setSource("mock");
        } else {
          setItems(rows.map((r) => ({
            id: r.id,
            coachId: r.coach_id,
            lastMessage: "",
            lastAt: relative(r.last_message_at),
            unread: 0,
          })));
          setSource("supabase");
        }
      } catch {
        if (!cancelled) {
          setItems(mockConversations);
          setSource("mock");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    // Realtime subscription on conversations so new threads + updated
    // last_message_at bubble up immediately.
    const channel = supabase
      .channel("conversations-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => { void load(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { conversations: items, loading, source };
};
