import { useCallback, useEffect, useState } from "react";

const storageKey = (userId?: string) =>
  userId ? `oc_saved_posts_${userId}` : "oc_saved_posts";

const read = (key: string): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const write = (key: string, ids: string[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(ids));
};

export const useSavedPosts = (userId?: string) => {
  const key = storageKey(userId);
  const [saved, setSaved] = useState<string[]>(() => read(key));

  // Re-load when user changes (login/logout).
  useEffect(() => {
    setSaved(read(key));
  }, [key]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setSaved(read(key));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const isSaved = useCallback((id: string) => saved.includes(id), [saved]);

  const toggle = useCallback(
    (id: string) => {
      setSaved((prev) => {
        const next = prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id];
        write(key, next);
        return next;
      });
    },
    [key],
  );

  return { saved, isSaved, toggle };
};
