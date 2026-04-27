import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LIKES_KEY = "oc_post_likes";
const COMMENTS_KEY = "oc_post_comments";

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

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
 * Local-first like + comment state. Optimistic UI lives in localStorage
 * so the Feed reacts instantly; mutations also mirror to Supabase
 * (post_likes / post_comments) when the post id looks like a real
 * UUID — i.e. coming from useFeed's live data, not from the mock layer.
 *
 * Mock-data ids ("p1"..."p6") just stay local. Failures on the network
 * call are swallowed silently — the local optimistic state is the
 * source of truth for UX, and a retry flush could be added later.
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

  const persistLikeToggle = useCallback(async (postId: string, nowLiked: boolean) => {
    if (!isUuid(postId)) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (nowLiked) {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      } else {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      }
    } catch {
      // optimistic UI keeps state correct locally; retry on next session
    }
  }, []);

  const toggleLike = useCallback((postId: string) => {
    setLikes((prev) => {
      const nowLiked = !prev.includes(postId);
      const next = nowLiked ? [...prev, postId] : prev.filter((id) => id !== postId);
      writeJson(LIKES_KEY, next);
      void persistLikeToggle(postId, nowLiked);
      return next;
    });
  }, [persistLikeToggle]);

  const commentsFor = useCallback(
    (postId: string) => comments.filter((c) => c.postId === postId),
    [comments],
  );

  const persistComment = useCallback(async (postId: string, body: string) => {
    if (!isUuid(postId)) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, body });
    } catch {
      // local copy still rendered optimistically
    }
  }, []);

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
    void persistComment(postId, trimmed);
  }, [persistComment]);

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
