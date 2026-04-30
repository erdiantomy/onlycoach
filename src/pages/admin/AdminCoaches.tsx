import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";
import { cn } from "@/lib/utils";

interface CoachRow {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  headline: string | null;
  niche: string | null;
  subscriber_count: number;
  is_published: boolean;
  created_at: string;
}

const AdminCoaches = () => {
  const [search, setSearch] = useState("");

  const { data: coaches = [], isLoading } = useQuery<CoachRow[]>({
    queryKey: ["admin-coaches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_profiles")
        .select("user_id, niche, subscriber_count, is_published, created_at, profiles(id, display_name, handle, avatar_url, headline)")
        .order("subscriber_count", { ascending: false })
        .limit(500);
      if (!data) return [];
      return data.map((c) => {
        const p = c.profiles as unknown as { id: string; display_name: string; handle: string; avatar_url: string | null; headline: string | null } | null;
        return {
          id: c.user_id,
          display_name: p?.display_name ?? "Unknown",
          handle: p?.handle ?? "",
          avatar_url: p?.avatar_url ?? null,
          headline: p?.headline ?? null,
          niche: c.niche,
          subscriber_count: c.subscriber_count ?? 0,
          is_published: c.is_published,
          created_at: c.created_at,
        };
      });
    },
  });

  const filtered = coaches.filter(
    (c) =>
      c.display_name.toLowerCase().includes(search.toLowerCase()) ||
      c.handle.toLowerCase().includes(search.toLowerCase()) ||
      (c.niche ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdminShell>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl">All Coaches ({coaches.length})</h2>
        <input
          className="brutal-input w-full sm:w-64"
          placeholder="Search name, handle, niche…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
      ) : (
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-ink-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Coach</th>
                <th className="px-3 py-2 text-left">Niche</th>
                <th className="px-3 py-2 text-left">Subscribers</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Joined</th>
                <th className="px-3 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={cn("border-t border-ink/30", i % 2 === 0 ? "bg-surface" : "bg-background")}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 shrink-0 border border-ink bg-accent overflow-hidden">
                        {c.avatar_url && <img src={c.avatar_url} className="h-full w-full object-cover" alt="" />}
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{c.display_name}</p>
                        {c.headline && <p className="text-xs text-muted-foreground">{c.headline}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{c.niche ?? "—"}</td>
                  <td className="px-3 py-2 font-semibold">{c.subscriber_count.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={cn("brutal-tag text-[10px]", c.is_published ? "" : "opacity-50")}>
                      {c.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <Link to={`/coach/${c.handle}`} className="brutal-tag text-xs" target="_blank">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
};

export default AdminCoaches;
