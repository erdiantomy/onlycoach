import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  communityPosts as mockPosts,
  findCoach,
  type CommunityPost,
} from "@/lib/mock";

interface RawCommunityPost {
  id: string;
  coach_id: string;
  user_id: string;
  body: string;
  is_announcement: boolean;
  created_at: string;
}

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

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
 * Live community posts for a single coach. Merges:
 *   - DB rows (when coachId is a UUID): subscribed to via realtime
 *     so other subscribers' posts appear without a poll.
 *   - mock seed: filtered by coachId, kept for the demo to ensure
 *     the page is never empty in dev.
 *
 * Returns posts in the existing CommunityPost shape so Community.tsx
 * doesn't need a rewrite.
 */
export const useCommunityPosts = (coachId: string) => {
  const [items, setItems] = useState<CommunityPost[]>(() =>
    mockPosts.filter((p) => p.coachId === coachId),
  );

  useEffect(() => {
    if (!isUuid(coachId)) {
      setItems(mockPosts.filter((p) => p.coachId === coachId));
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("community_posts")
          .select("id, coach_id, user_id, body, is_announcement, created_at")
          .eq("coach_id", coachId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (cancelled || error) return;
        const rows = (data as unknown as RawCommunityPost[] | null) ?? [];
        const coach = findCoach(coachId);
        setItems(rows.map((r) => ({
          id: r.id,
          coachId: r.coach_id,
          authorName: r.user_id === coach?.id ? coach.name : "Member",
          authorIsCoach: r.user_id === coach?.id,
          body: r.body,
          createdAt: relative(r.created_at),
          isAnnouncement: r.is_announcement,
          replies: 0,
        })));
      } catch {
        // optimistic UI on caller — keep whatever's already rendered
      }
    };

    void load();

    const channel = supabase
      .channel(`community-${coachId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_posts",
          filter: `coach_id=eq.${coachId}`,
        },
        () => { void load(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [coachId]);

  return items;
};
