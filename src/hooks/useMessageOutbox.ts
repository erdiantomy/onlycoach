import { useCallback, useEffect, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";

/**
 * useMessageOutbox — durable per-conversation outbox for messages composed
 * offline.
 *
 * Messages are persisted to localStorage so they survive WebView reloads /
 * app backgrounding. When the network comes back, `flush(send)` is called
 * with a sender callback — successful sends are removed from the queue,
 * failures stay queued.
 *
 * State machine per item: queued → sending → (sent | failed)
 *   - "queued": waiting for network
 *   - "sending": flush() in progress
 *   - "failed": last attempt errored; user can manually retry
 */

export type OutboxStatus = "queued" | "sending" | "failed";

export interface OutboxItem {
  id: string; // local UUID, used as optimistic message id
  conversationId: string;
  body: string;
  createdAt: number;
  status: OutboxStatus;
  lastError?: string;
}

const STORAGE_KEY = "onlycoach.outbox.v1";

const load = (): OutboxItem[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    return [];
  }
};

const save = (items: OutboxItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota / private mode — ignore. Worst case items live in memory only.
  }
};

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `out_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export const useMessageOutbox = (conversationId: string | null) => {
  const { online } = useOnlineStatus();
  const [items, setItems] = useState<OutboxItem[]>(load);

  useEffect(() => save(items), [items]);

  const enqueue = useCallback(
    (body: string): OutboxItem | null => {
      if (!conversationId || !body.trim()) return null;
      const item: OutboxItem = {
        id: uuid(),
        conversationId,
        body: body.trim(),
        createdAt: Date.now(),
        status: "queued",
      };
      setItems((prev) => [...prev, item]);
      return item;
    },
    [conversationId],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  /**
   * Attempt to send every queued / failed item via the provided sender.
   * Sender returns true on success. Items are processed serially to
   * preserve message order within a conversation.
   */
  const flush = useCallback(
    async (sender: (item: OutboxItem) => Promise<boolean>) => {
      // Snapshot pending; process in createdAt order
      const pending = items
        .filter((i) => i.status !== "sending")
        .sort((a, b) => a.createdAt - b.createdAt);

      for (const item of pending) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "sending" as const, lastError: undefined } : i)),
        );
        try {
          const ok = await sender(item);
          if (ok) {
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } else {
            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id ? { ...i, status: "failed" as const, lastError: "Send failed" } : i,
              ),
            );
            break; // stop on first failure to keep ordering safe
          }
        } catch (err: any) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: "failed" as const, lastError: err?.message ?? "Network error" }
                : i,
            ),
          );
          break;
        }
      }
    },
    [items],
  );

  // Items scoped to the current conversation (most common consumer view)
  const forConversation = conversationId
    ? items.filter((i) => i.conversationId === conversationId)
    : [];

  return { items, forConversation, enqueue, remove, flush, online };
};
