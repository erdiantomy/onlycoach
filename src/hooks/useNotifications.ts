import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "oc_notifications";
const READ_KEY = "oc_notifications_read";

export type NotificationKind =
  | "post"
  | "message"
  | "subscription"
  | "challenge"
  | "system";

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  at: string;
  createdAtMs: number;
}

const SEED: Notification[] = [
  { id: "n1", kind: "message",      title: "Maya Lestari sent a DM",          body: "\"Form looked great on the last set — let's add 2.5kg next week.\"", href: "/messages", at: "12m",  createdAtMs: Date.now() - 12 * 60_000 },
  { id: "n2", kind: "post",         title: "Theo Lindberg posted",            body: "The 2-minute morning audit. Free this week.",                            href: "/feed",     at: "5h",   createdAtMs: Date.now() - 5 * 3600_000 },
  { id: "n3", kind: "subscription", title: "Subscription renewed",            body: "Maya Lestari · Pro · IDR 299,000 / month.",                              href: "/me",       at: "1d",   createdAtMs: Date.now() - 24 * 3600_000 },
  { id: "n4", kind: "challenge",    title: "30-Day Strength Reset starts Mon",body: "Curriculum is ready. Cohort fills fast.",                                href: "/challenges", at: "2d", createdAtMs: Date.now() - 2 * 24 * 3600_000 },
  { id: "n5", kind: "system",       title: "New community update",            body: "Reactions and saved posts shipped today.",                               at: "3d",   createdAtMs: Date.now() - 3 * 24 * 3600_000 },
];

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const useNotifications = () => {
  const [items, setItems] = useState<Notification[]>(() => {
    const stored = readJson<Notification[]>(STORAGE_KEY, []);
    if (stored.length === 0) {
      writeJson(STORAGE_KEY, SEED);
      return SEED;
    }
    return stored;
  });
  const [readIds, setReadIds] = useState<string[]>(() => readJson<string[]>(READ_KEY, []));

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readJson<Notification[]>(STORAGE_KEY, []));
      if (e.key === READ_KEY) setReadIds(readJson<string[]>(READ_KEY, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const unread = items.filter((n) => !readIds.includes(n.id));
  const unreadCount = unread.length;

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeJson(READ_KEY, next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(() => {
      const next = items.map((n) => n.id);
      writeJson(READ_KEY, next);
      return next;
    });
  }, [items]);

  return { items, unreadCount, isRead: (id: string) => readIds.includes(id), markRead, markAllRead };
};
