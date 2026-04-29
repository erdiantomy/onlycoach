import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import NotFound from "./NotFound";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ShareProfileButton } from "@/components/ShareProfileButton";
import { EditProfileModal } from "@/components/EditProfileModal";
import { useFollow } from "@/hooks/useFollow";

type Tab = "badges" | "coaches" | "activity";

interface MenteeData {
  id: string;
  display_name: string;
  handle: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  follower_count: number;
  is_public: boolean;
  show_subscriptions: boolean;
  interests: string[];
}

interface Badge {
  id: string;
  badge_type: string;
  label: string;
  icon: string;
  earned_at: string;
}

interface CoachSub {
  id: string;
  coach_id: string;
  coach_name: string;
  coach_handle: string;
  coach_avatar: string | null;
  tier_name: string;
  created_at: string;
}

interface ActivityPost {
  id: string;
  body: string;
  created_at: string;
  coach_id: string;
}

const MenteeProfile = () => {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useSession();
  const [tab, setTab] = useState<Tab>("badges");
  const [editOpen, setEditOpen] = useState(false);

  const { data: mentee, isLoading } = useQuery<MenteeData | null>({
    queryKey: ["mentee-profile", handle],
    enabled: !!handle,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, handle, bio, avatar_url, created_at, follower_count, mentee_profiles(is_public, show_subscriptions, interests)")
        .eq("handle", handle!)
        .maybeSingle();
      if (error || !data) return null;
      const mp = data.mentee_profiles as unknown as { is_public: boolean; show_subscriptions: boolean; interests: string[] } | null;
      return {
        id: data.id,
        display_name: data.display_name,
        handle: data.handle,
        bio: data.bio,
        avatar_url: data.avatar_url,
        created_at: data.created_at,
        follower_count: (data as { follower_count?: number }).follower_count ?? 0,
        is_public: mp?.is_public ?? true,
        show_subscriptions: mp?.show_subscriptions ?? true,
        interests: mp?.interests ?? [],
      };
    },
  });

  const { data: badges = [] } = useQuery<Badge[]>({
    queryKey: ["mentee-badges", mentee?.id],
    enabled: !!mentee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("badges")
        .select("id, badge_type, label, icon, earned_at")
        .eq("user_id", mentee!.id)
        .order("earned_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: coachSubs = [] } = useQuery<CoachSub[]>({
    queryKey: ["mentee-subs", mentee?.id],
    enabled: !!mentee?.id && (mentee?.show_subscriptions || user?.id === mentee?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, coach_id, created_at, subscription_tiers(name)")
        .eq("mentee_id", mentee!.id)
        .in("status", ["active", "trialing"]);
      if (!data?.length) return [];

      const coachIds = [...new Set(data.map((s) => s.coach_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, handle, avatar_url")
        .in("id", coachIds);

      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));
      return data.map((s) => {
        const p = pm.get(s.coach_id);
        const t = s.subscription_tiers as unknown as { name: string } | null;
        return {
          id: s.id,
          coach_id: s.coach_id,
          coach_name: p?.display_name ?? "Coach",
          coach_handle: p?.handle ?? "",
          coach_avatar: p?.avatar_url ?? null,
          tier_name: t?.name ?? "Tier",
          created_at: s.created_at,
        };
      });
    },
  });

  const { data: activityPosts = [] } = useQuery<ActivityPost[]>({
    queryKey: ["mentee-activity", mentee?.id],
    enabled: !!mentee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id, body, created_at, coach_id")
        .eq("user_id", mentee!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const {
    isFollowing,
    followerCount,
    followingCount,
    toggleFollow,
    loading: followLoading,
  } = useFollow(mentee?.id ?? null);

  useEffect(() => {
    if (mentee) {
      document.title = `${mentee.display_name} (@${mentee.handle}) | OnlyCoach`;
    }
    return () => { document.title = "OnlyCoach"; };
  }, [mentee]);

  useEffect(() => {
    if (!mentee) return;
    supabase.from("profile_views").insert({
      profile_id: mentee.id,
      viewer_id: user?.id ?? null,
      referrer: document.referrer || null,
    }).then(() => {});
  }, [mentee?.id, user?.id]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-10 animate-pulse space-y-4">
          <div className="h-24 w-24 border-2 border-ink bg-surface" />
          <div className="h-8 w-48 border-2 border-ink bg-surface" />
          <div className="h-4 w-64 border-2 border-ink bg-surface" />
        </div>
      </AppShell>
    );
  }

  if (!mentee) return <NotFound />;

  const isOwner = user?.id === mentee.id;
  const isPrivate = !mentee.is_public && !isOwner;

  const memberSince = new Date(mentee.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell>
      {/* Profile header */}
      <div className="border-b-2 border-ink bg-surface">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 shrink-0 border-2 border-ink bg-accent overflow-hidden md:h-28 md:w-28">
                {mentee.avatar_url && (
                  <img src={mentee.avatar_url} alt={mentee.display_name} className="h-full w-full object-cover" />
                )}
              </div>
              <div>
                <h1 className="font-display text-3xl md:text-4xl">{mentee.display_name}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">@{mentee.handle}</p>
                {!isPrivate && mentee.bio && (
                  <p className="mt-2 text-sm max-w-sm">{mentee.bio}</p>
                )}
                <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Member since {memberSince}
                </p>
                {!isPrivate && (
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span>{followingCount} following</span>
                    <span>{followerCount} followers</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <ShareProfileButton name={mentee.display_name} handle={mentee.handle} role="mentee" />
              {isOwner ? (
                <button onClick={() => setEditOpen(true)} className="brutal-tag cursor-pointer select-none">
                  Edit profile
                </button>
              ) : user && !isPrivate ? (
                <Button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={cn(
                    "border-2 border-ink shadow-brutal-sm text-sm",
                    isFollowing
                      ? "bg-surface text-foreground hover:bg-destructive/10"
                      : "bg-ink text-ink-foreground hover:bg-ink/90",
                  )}
                >
                  <Users className="mr-1.5 h-4 w-4" />
                  {isFollowing ? "Unfollow" : "Follow"}
                </Button>
              ) : null}
            </div>
          </div>

          {!isPrivate && mentee.interests.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {mentee.interests.map((i) => (
                <span key={i} className="brutal-tag">{i}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {isPrivate ? (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="font-display text-2xl">This profile is private.</p>
          <p className="mt-2 text-sm text-muted-foreground">Only the owner can see their full profile.</p>
        </div>
      ) : (
        <>
          {/* Tab nav */}
          <div className="sticky top-16 z-10 border-b-2 border-ink bg-background md:top-0">
            <div className="mx-auto flex w-full max-w-3xl px-4 md:px-8">
              {(["badges", "coaches", "activity"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "border-r-2 border-ink px-5 py-3 text-xs font-semibold uppercase tracking-wide last:border-r-0",
                    tab === t ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/40",
                  )}
                >{t}</button>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
            {tab === "badges" && (
              <section>
                <h2 className="font-display text-2xl">Badges</h2>
                {badges.length === 0 ? (
                  <div className="brutal-card-sm mt-4 p-8 text-center">
                    <p className="font-display text-xl">No badges yet.</p>
                    <p className="mt-1 text-sm text-muted-foreground">Complete challenges to earn your first badge.</p>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {badges.map((b) => (
                      <div key={b.id} className="brutal-card-sm flex items-center gap-4 p-4">
                        <span className="text-3xl">{b.icon}</span>
                        <div>
                          <p className="font-display text-lg leading-tight">{b.label}</p>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {new Date(b.earned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === "coaches" && (
              <section>
                <h2 className="font-display text-2xl">Coaches</h2>
                {!mentee.show_subscriptions && !isOwner ? (
                  <div className="brutal-card-sm mt-4 p-8 text-center">
                    <p className="text-sm text-muted-foreground">This member has hidden their subscriptions.</p>
                  </div>
                ) : coachSubs.length === 0 ? (
                  <div className="brutal-card-sm mt-4 p-8 text-center">
                    <p className="font-display text-xl">No active subscriptions.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <Link to="/discover" className="underline">Browse coaches</Link> to get started.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {coachSubs.map((s) => (
                      <div key={s.id} className="brutal-card-sm flex items-center gap-4 p-4">
                        <div className="h-12 w-12 shrink-0 border-2 border-ink bg-accent overflow-hidden">
                          {s.coach_avatar && (
                            <img src={s.coach_avatar} alt={s.coach_name} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-display text-lg leading-tight">{s.coach_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.tier_name} · Since {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <Link
                          to={`/coach/${s.coach_handle}`}
                          className="brutal-tag whitespace-nowrap"
                        >
                          View coach →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === "activity" && (
              <section>
                <h2 className="font-display text-2xl">Activity</h2>
                {activityPosts.length === 0 ? (
                  <div className="brutal-card-sm mt-4 p-8 text-center">
                    <p className="font-display text-xl">No community posts yet.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Posts in coach communities will show up here.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {activityPosts.map((p) => (
                      <article key={p.id} className="brutal-card-sm p-4">
                        <p className="text-sm">{p.body}</p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </>
      )}

      {isOwner && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          role="mentee"
          initial={{
            display_name: mentee.display_name,
            handle: mentee.handle,
            bio: mentee.bio,
            headline: null,
            avatar_url: mentee.avatar_url,
            interests: mentee.interests,
            is_public: mentee.is_public,
            show_subscriptions: mentee.show_subscriptions,
          }}
        />
      )}
    </AppShell>
  );
};

export default MenteeProfile;
