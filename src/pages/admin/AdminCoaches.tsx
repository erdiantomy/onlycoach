import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminShell from "./AdminShell";
import { Input } from "@/components/ui/input";
import { ExternalLink } from "lucide-react";

interface Row {
  user_id: string;
  niche: string;
  subscriber_count: number;
  is_published: boolean;
  created_at: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  headline: string | null;
}

export default function AdminCoaches() {
  const [q, setQ] = useState("");
  const { data: rows = [] } = useQuery<Row[]>({
    queryKey: ["admin-coaches"],
    queryFn: async () => {
      const { data: cps } = await supabase
        .from("coach_profiles")
        .select("user_id, niche, subscriber_count, is_published, created_at")
        .order("subscriber_count", { ascending: false })
        .limit(500);
      const ids = (cps ?? []).map((c) => c.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, handle, avatar_url, headline")
        .in("id", ids);
      const pMap = new Map((profs ?? []).map((p) => [p.id, p]));
      return (cps ?? []).map((c) => ({
        ...c,
        ...(pMap.get(c.user_id) ?? { display_name: "—", handle: "—", avatar_url: null, headline: null }),
      })) as Row[];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.display_name?.toLowerCase().includes(s) || r.handle?.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <AdminShell title="Coaches" subtitle={`${rows.length} coaches`}>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search coaches…" className="mb-4 max-w-md border-2 border-ink" />
      <div className="overflow-x-auto border-2 border-ink">
        <table className="w-full text-sm">
          <thead className="bg-ink text-ink-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Coach</th>
              <th className="px-3 py-2 text-left">Headline</th>
              <th className="px-3 py-2 text-left">Niche</th>
              <th className="px-3 py-2 text-left">Subs</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.user_id} className={`border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"}`}>
                <td className="flex items-center gap-2 px-3 py-2">
                  {r.avatar_url && <img src={r.avatar_url} alt="" className="h-7 w-7 border-2 border-ink object-cover" />}
                  <div>
                    <div className="font-medium">{r.display_name}</div>
                    <div className="text-xs text-muted-foreground">@{r.handle}</div>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.headline ?? "—"}</td>
                <td className="px-3 py-2">{r.niche}</td>
                <td className="px-3 py-2">{r.subscriber_count}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                      r.is_published ? "bg-green-200 text-green-900" : "bg-yellow-200 text-yellow-900"
                    }`}
                  >
                    {r.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <a href={`/coach/${r.handle}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
