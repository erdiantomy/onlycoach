import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "oc_saved_posts";

const read = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
};

/**
 * Local-first bookmarks. Mirrors to Supabase post_engagements on the
 * server; this hook owns optimistic state so the UI reacts instantly.
 */
export const useSavedPosts = () => {
  const [saved, setSaved] = useState<string[]>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSaved(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isSaved = useCallback((id: string) => saved.includes(id), [saved]);

  const toggle = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      write(next);
      return next;
    });
  }, []);

  return { saved, isSaved, toggle };
};
