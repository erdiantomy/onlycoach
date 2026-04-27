import { useQuery } from "@tanstack/react-query";
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

const fetchFeed = async (): Promise<{ posts: Post[]; source: "supabase" | "mock" }> => {
  const { data, error } = await supabase
    .from("posts")
    .select("id, coach_id, body, media_type, required_tier_id, like_count, comment_count, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  const rows = (data as unknown as RawPostRow[] | null) ?? [];
  if (rows.length === 0) return { posts: mockPosts, source: "mock" };

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
  return { posts: mapped, source: "supabase" };
};

/**
 * Cached, deduped fetch of the feed via react-query.
 *
 * - 30s staleTime so navigating Feed → CoachProfile → Feed reuses
 *   the cached data instead of refetching.
 * - RLS on the posts table is what enforces tier-based visibility
 *   server-side; this hook just renders whatever the user has
 *   access to.
 * - On error or empty result, falls back to mock data so the UI is
 *   never blank in dev.
 */
export const useFeed = () => {
  const query = useQuery({
    queryKey: ["feed", "v1"],
    queryFn: fetchFeed,
    staleTime: 30_000,
    placeholderData: { posts: mockPosts, source: "mock" as const },
  });

  return {
    posts: query.data?.posts ?? mockPosts,
    loading: query.isLoading,
    source: query.data?.source ?? "mock",
  };
};
