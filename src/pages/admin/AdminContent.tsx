import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminShell from "./AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { logAdminAction } from "@/lib/adminAudit";
import { toast } from "sonner";

interface CommunityRow {
  id: string;
  body: string;
  user_id: string;
  coach_id: string | null;
  created_at: string;
  author_name: string;
  coach_name: string;
}
interface PostRow {
  id: string;
  body: string;
  title: string | null;
  is_locked: boolean;
  coach_id: string;
  created_at: string;
  coach_name: string;
}

export default function AdminContent() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"community" | "posts">("community");
  const [q, setQ] = useState("");

  const { data: comm = [] } = useQuery<CommunityRow[]>({
    queryKey: ["admin-community"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id, body, user_id, coach_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      const ids = Array.from(new Set([...(data ?? []).flatMap((r) => [r.user_id, r.coach_id].filter(Boolean) as string[])]));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, display_name").in("id", ids)
        : { data: [] as { id: string; display_name: string }[] };
      const m = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
      return (data ?? []).map((r) => ({ ...r, author_name: m.get(r.user_id) ?? "—", coach_name: r.coach_id ? m.get(r.coach_id) ?? "—" : "—" })) as CommunityRow[];
    },
  });

  const { data: posts = [] } = useQuery<PostRow[]>({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, body, title, is_locked, coach_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      const ids = Array.from(new Set((data ?? []).map((r) => r.coach_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, display_name").in("id", ids)
        : { data: [] as { id: string; display_name: string }[] };
      const m = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
      return (data ?? []).map((r) => ({ ...r, coach_name: m.get(r.coach_id) ?? "—" })) as PostRow[];
    },
  });

  const filteredComm = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? comm.filter((c) => c.body?.toLowerCase().includes(s) || c.author_name.toLowerCase().includes(s)) : comm;
  }, [comm, q]);
  const filteredPosts = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? posts.filter((p) => (p.title ?? "").toLowerCase().includes(s) || p.body?.toLowerCase().includes(s) || p.coach_name.toLowerCase().includes(s)) : posts;
  }, [posts, q]);

  const delCommunity = async (id: string) => {
    if (!confirm("Delete this community post?")) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: "community_post.delete", target_table: "community_posts", target_id: id });
    qc.invalidateQueries({ queryKey: ["admin-community"] });
  };
  const delPost = async (id: string) => {
    if (!confirm("Delete this coach post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: "post.delete", target_table: "posts", target_id: id });
    qc.invalidateQueries({ queryKey: ["admin-posts"] });
  };

  return (
    <AdminShell title="Content">
      <div className="mb-4 flex gap-2">
        {(["community", "posts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase ${tab === t ? "bg-ink text-ink-foreground" : "bg-surface"}`}
          >
            {t === "community" ? "Community posts" : "Coach posts"}
          </button>
        ))}
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="mb-4 max-w-md border-2 border-ink" />

      {tab === "community" ? (
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-ink-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Body</th>
                <th className="px-3 py-2 text-left">Author</th>
                <th className="px-3 py-2 text-left">Coach</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredComm.map((c, i) => (
                <tr key={c.id} className={`border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"}`}>
                  <td className="max-w-md truncate px-3 py-2">{c.body}</td>
                  <td className="px-3 py-2">{c.author_name}</td>
                  <td className="px-3 py-2">{c.coach_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" onClick={() => delCommunity(c.id)} className="border-2 border-ink bg-destructive text-destructive-foreground">
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-ink-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Title / body</th>
                <th className="px-3 py-2 text-left">Coach</th>
                <th className="px-3 py-2 text-left">Locked</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((p, i) => (
                <tr key={p.id} className={`border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"}`}>
                  <td className="max-w-md truncate px-3 py-2">{p.title ?? p.body}</td>
                  <td className="px-3 py-2">{p.coach_name}</td>
                  <td className="px-3 py-2">{p.is_locked ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" onClick={() => delPost(p.id)} className="border-2 border-ink bg-destructive text-destructive-foreground">
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
