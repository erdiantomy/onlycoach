import { useCallback, useEffect, useState } from "react";

const LIKES_KEY = "oc_post_likes";
const COMMENTS_KEY = "oc_post_comments";

export interface LocalComment {
  id: string;
  postId: string;
  body: string;
  at: string; // human-friendly timestamp
}

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

/**
 * Local-first like + comment state. Optimistic UI lives here so the
 * Feed reacts instantly; in production each toggle would also fire a
 * Supabase mutation against post_likes / post_comments.
 */
export const usePostEngagement = () => {
  const [likes, setLikes] = useState<string[]>(() => readJson<string[]>(LIKES_KEY, []));
  const [comments, setComments] = useState<LocalComment[]>(() => readJson<LocalComment[]>(COMMENTS_KEY, []));

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LIKES_KEY) setLikes(readJson<string[]>(LIKES_KEY, []));
      if (e.key === COMMENTS_KEY) setComments(readJson<LocalComment[]>(COMMENTS_KEY, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isLiked = useCallback((postId: string) => likes.includes(postId), [likes]);

  const toggleLike = useCallback((postId: string) => {
    setLikes((prev) => {
      const next = prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId];
      writeJson(LIKES_KEY, next);
      return next;
    });
  }, []);

  const commentsFor = useCallback(
    (postId: string) => comments.filter((c) => c.postId === postId),
    [comments],
  );

  const addComment = useCallback((postId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setComments((prev) => {
      const next = [
        ...prev,
        { id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, postId, body: trimmed, at: "just now" },
      ];
      writeJson(COMMENTS_KEY, next);
      return next;
    });
  }, []);

  const removeComment = useCallback((commentId: string) => {
    setComments((prev) => {
      const next = prev.filter((c) => c.id !== commentId);
      writeJson(COMMENTS_KEY, next);
      return next;
    });
  }, []);

  return {
    isLiked,
    toggleLike,
    commentsFor,
    addComment,
    removeComment,
    totalLikes: likes.length,
  };
};
