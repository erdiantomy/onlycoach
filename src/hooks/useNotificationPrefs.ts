import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "oc_notification_prefs";

export type Channel = "email" | "push" | "sms";
export type Topic = "newPost" | "newMessage" | "subscription" | "challenge" | "weeklyDigest";

export type NotificationPrefs = Record<Topic, Record<Channel, boolean>>;

export const TOPIC_LABELS: Record<Topic, { title: string; helper: string }> = {
  newPost:       { title: "New posts from coaches",   helper: "When a coach you follow publishes." },
  newMessage:    { title: "Direct messages",          helper: "1:1 chats from coaches and replies." },
  subscription:  { title: "Subscription & billing",   helper: "Renewals, payment issues, plan changes." },
  challenge:     { title: "Challenges & cohorts",     helper: "Start dates, daily lessons, milestones." },
  weeklyDigest:  { title: "Weekly digest",            helper: "A Monday roundup of what's new." },
};

const DEFAULT_PREFS: NotificationPrefs = {
  newPost:      { email: true,  push: true,  sms: false },
  newMessage:   { email: false, push: true,  sms: false },
  subscription: { email: true,  push: true,  sms: false },
  challenge:    { email: true,  push: true,  sms: false },
  weeklyDigest: { email: true,  push: false, sms: false },
};

const read = (): NotificationPrefs => {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    // shallow-merge so new topics added later get sensible defaults
    return { ...DEFAULT_PREFS, ...parsed } as NotificationPrefs;
  } catch {
    return DEFAULT_PREFS;
  }
};

const write = (prefs: NotificationPrefs) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
};

export const useNotificationPrefs = () => {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setChannel = useCallback((topic: Topic, channel: Channel, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [topic]: { ...prev[topic], [channel]: value } };
      write(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
    write(DEFAULT_PREFS);
  }, []);

  return { prefs, setChannel, reset };
};
