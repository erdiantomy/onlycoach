import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ContentTab = "community" | "posts";

interface CommunityPost {
  id: string;
  body: string;
  author_name: string;
  author_handle: string;
  coach_name: string;
  coach_handle: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  coach_name: string;
  coach_handle: string;
  is_locked: boolean;
  created_at: string;
}

const AdminContent = () => {
  const { user: adminUser } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<ContentTab>("community");
  const [search, setSearch] = useState("");

  const { data: communityPosts = [], isLoading: cpLoading } = useQuery<CommunityPost[]>({
    queryKey: ["admin-community-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id, body, user_id, coach_id, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (!data?.length) return [];

      const allIds = [...new Set([...data.map((p) => p.user_id), ...data.map((p) => p.coach_id)])];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, handle").in("id", allIds);
      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));

      return data.map((p) => {
        const author = pm.get(p.user_id);
        const coach = pm.get(p.coach_id);
        return {
          id: p.id,
          body: p.body,
          author_name: author?.display_name ?? "—",
          author_handle: author?.handle ?? "",
          coach_name: coach?.display_name ?? "—",
          coach_handle: coach?.handle ?? "",
          created_at: p.created_at,
        };
      });
    },
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, coach_id, is_locked, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (!data?.length) return [];

      const coachIds = [...new Set(data.map((p) => p.coach_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, handle").in("id", coachIds);
      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));

      return data.map((p) => {
        const coach = pm.get(p.coach_id);
        return {
          id: p.id,
          title: p.title,
          coach_name: coach?.display_name ?? "—",
          coach_handle: coach?.handle ?? "",
          is_locked: p.is_locked,
          created_at: p.created_at,
        };
      });
    },
  });

  const deleteCommunityPost = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.from("community_posts").delete().eq("id", postId);
      await supabase.from("admin_audit_log").insert({
        admin_id: adminUser!.id,
        action: "delete_community_post",
        target_table: "community_posts",
        target_id: postId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-community-posts"] });
      toast.success("Post deleted");
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.from("posts").delete().eq("id", postId);
      await supabase.from("admin_audit_log").insert({
        admin_id: adminUser!.id,
        action: "delete_post",
        target_table: "posts",
        target_id: postId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("Post deleted");
    },
  });

  const filteredCommunity = communityPosts.filter(
    (p) =>
      p.body.toLowerCase().includes(search.toLowerCase()) ||
      p.author_name.toLowerCase().includes(search.toLowerCase()) ||
      p.coach_name.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.coach_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdminShell>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl">Content Moderation</h2>
        <input
          className="brutal-input w-full sm:w-64"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mb-4 flex gap-1">
        {(["community", "posts"] as ContentTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "border-2 border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide",
              tab === t ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/40",
            )}
          >
            {t === "community" ? "Community Posts" : "Coach Posts"}
          </button>
        ))}
      </div>

      {tab === "community" && (
        cpLoading ? (
          <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
        ) : (
          <div className="space-y-2">
            {filteredCommunity.map((p) => (
              <div key={p.id} className="brutal-card-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{p.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      By <span className="font-medium">@{p.author_handle}</span> in{" "}
                      <span className="font-medium">@{p.coach_handle}</span>'s community ·{" "}
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (confirm("Delete this post?")) deleteCommunityPost.mutate(p.id); }}
                    className="brutal-tag shrink-0 text-xs text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {filteredCommunity.length === 0 && (
              <div className="brutal-card-sm p-8 text-center text-sm text-muted-foreground">No posts found.</div>
            )}
          </div>
        )
      )}

      {tab === "posts" && (
        postsLoading ? (
          <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto border-2 border-ink">
            <table className="w-full text-sm">
              <thead className="bg-ink text-ink-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Coach</th>
                  <th className="px-3 py-2 text-left">Access</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((p, i) => (
                  <tr key={p.id} className={cn("border-t border-ink/30", i % 2 === 0 ? "bg-surface" : "bg-background")}>
                    <td className="px-3 py-2 font-medium max-w-xs truncate">{p.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">@{p.coach_handle}</td>
                    <td className="px-3 py-2">
                      <span className="brutal-tag text-[10px]">{p.is_locked ? "Locked" : "Free"}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => { if (confirm("Delete this post?")) deletePost.mutate(p.id); }}
                        className="brutal-tag text-xs text-destructive"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </AdminShell>
  );
};

export default AdminContent;
