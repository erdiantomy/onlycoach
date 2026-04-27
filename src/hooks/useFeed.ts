import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { posts as mockPosts, type Post } from "@/lib/mock";

interface RawPostRow {
  id: string;
  coach_id: string;
  body: string;
  media_type: "text" | "image" | "video" | "pdf";
  required_tier_id: string | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string;
}

const relativeTime = (iso: string): string => {
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
 * Fetch posts from Supabase. Returns the rows mapped into the existing
 * mock Post shape so Feed components don't need to be rewritten.
 *
 * Falls back to mock data on error or empty result so the surface is
 * never blank in dev. RLS on the posts table is what enforces
 * tier gating server-side; this hook just renders whatever the user
 * has access to.
 */
export const useFeed = () => {
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "mock">("mock");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id, coach_id, body, media_type, required_tier_id, like_count, comment_count, created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (cancelled) return;
        if (error) throw error;
        const rows = (data as unknown as RawPostRow[] | null) ?? [];
        if (rows.length === 0) {
          setPosts(mockPosts);
          setSource("mock");
        } else {
          const mapped: Post[] = rows.map((r) => ({
            id: r.id,
            coachId: r.coach_id,
            body: r.body,
            createdAt: relativeTime(r.created_at),
            requiredTier: r.required_tier_id,
            mediaType: r.media_type,
            likes: r.like_count ?? 0,
            comments: r.comment_count ?? 0,
          }));
          setPosts(mapped);
          setSource("supabase");
        }
      } catch {
        if (!cancelled) {
          setPosts(mockPosts);
          setSource("mock");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  return { posts, loading, source };
};
