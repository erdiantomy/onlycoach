import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

interface UseFollowResult {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  toggleFollow: () => Promise<void>;
  loading: boolean;
}

export const useFollow = (targetUserId: string | null): UseFollowResult => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [optimisticFollowing, setOptimisticFollowing] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  // Check if current user follows target
  const { data: isFollowing = false, isLoading: checkLoading } = useQuery<boolean>({
    queryKey: ["follow-status", user?.id, targetUserId],
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user!.id)
        .eq("following_id", targetUserId!)
        .maybeSingle();
      return !!data;
    },
  });

  // Follower count for target
  const { data: followerCount = 0, isLoading: countLoading } = useQuery<number>({
    queryKey: ["follower-count", targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { count } = await supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", targetUserId!);
      return count ?? 0;
    },
  });

  // Following count for target (how many they follow)
  const { data: followingCount = 0 } = useQuery<number>({
    queryKey: ["following-count", targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { count } = await supabase
        .from("follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", targetUserId!);
      return count ?? 0;
    },
  });

  // Reset optimistic state when real data arrives
  useEffect(() => {
    setOptimisticFollowing(null);
    setOptimisticCount(null);
  }, [isFollowing, followerCount]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user || !targetUserId) throw new Error("Not signed in");
      const currently = optimisticFollowing ?? isFollowing;
      if (currently) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: targetUserId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["follower-count", targetUserId] });
    },
    onError: () => {
      // Roll back optimistic state
      setOptimisticFollowing(null);
      setOptimisticCount(null);
      toast.error("Couldn't update follow status");
    },
  });

  const toggleFollow = async () => {
    if (!user) {
      toast.error("Sign in to follow");
      return;
    }
    const currently = optimisticFollowing ?? isFollowing;
    const currentCount = optimisticCount ?? followerCount;
    // Apply optimistic update
    setOptimisticFollowing(!currently);
    setOptimisticCount(currently ? Math.max(0, currentCount - 1) : currentCount + 1);
    await mutation.mutateAsync();
  };

  return {
    isFollowing: optimisticFollowing ?? isFollowing,
    followerCount: optimisticCount ?? followerCount,
    followingCount,
    toggleFollow,
    loading: checkLoading || countLoading || mutation.isPending,
  };
};
