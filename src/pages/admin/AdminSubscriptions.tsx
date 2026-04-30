import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminShell from "./AdminShell";
import { Button } from "@/components/ui/button";
import { logAdminAction } from "@/lib/adminAudit";
import { toast } from "sonner";

const STATUS_FILTERS = ["all", "active", "trialing", "canceled", "past_due"] as const;
type Filter = (typeof STATUS_FILTERS)[number];

interface Row {
  id: string;
  status: string;
  current_period_end: string | null;
  mentee_id: string;
  coach_id: string;
  tier_id: string;
  mentee_name: string;
  coach_name: string;
  tier_name: string;
}

export default function AdminSubscriptions() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: rows = [] } = useQuery<Row[]>({
    queryKey: ["admin-subs"],
    queryFn: async () => {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id, status, current_period_end, mentee_id, coach_id, tier_id")
        .order("created_at", { ascending: false })
        .limit(500);
      const ids = Array.from(new Set([...(subs ?? []).map((s) => s.mentee_id), ...(subs ?? []).map((s) => s.coach_id)]));
      const tierIds = Array.from(new Set((subs ?? []).map((s) => s.tier_id)));
      const [profs, tiers] = await Promise.all([
        ids.length ? supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] as { id: string; display_name: string }[] },
        tierIds.length ? supabase.from("subscription_tiers").select("id, name").in("id", tierIds) : { data: [] as { id: string; name: string }[] },
      ]);
      const pMap = new Map((profs.data ?? []).map((p) => [p.id, p.display_name]));
      const tMap = new Map((tiers.data ?? []).map((t) => [t.id, t.name]));
      return (subs ?? []).map((s) => ({
        ...s,
        mentee_name: pMap.get(s.mentee_id) ?? "—",
        coach_name: pMap.get(s.coach_id) ?? "—",
        tier_name: tMap.get(s.tier_id) ?? "—",
      })) as Row[];
    },
  });

  const filtered = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);

  const cancel = async (id: string) => {
    if (!confirm("Cancel this subscription?")) return;
    const { error } = await supabase.from("subscriptions").update({ status: "canceled" }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: "subscription.cancel", target_table: "subscriptions", target_id: id });
    toast.success("Canceled");
    qc.invalidateQueries({ queryKey: ["admin-subs"] });
  };

  return (
    <AdminShell title="Subscriptions" subtitle={`${rows.length} most recent`}>
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase ${filter === s ? "bg-ink text-ink-foreground" : "bg-surface"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto border-2 border-ink">
        <table className="w-full text-sm">
          <thead className="bg-ink text-ink-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Mentee</th>
              <th className="px-3 py-2 text-left">Coach</th>
              <th className="px-3 py-2 text-left">Tier</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Period end</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} className={`border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"}`}>
                <td className="px-3 py-2">{r.mentee_name}</td>
                <td className="px-3 py-2">{r.coach_name}</td>
                <td className="px-3 py-2">{r.tier_name}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                      r.status === "active"
                        ? "bg-green-200 text-green-900"
                        : r.status === "trialing"
                        ? "bg-yellow-200 text-yellow-900"
                        : r.status === "canceled"
                        ? "bg-red-200 text-red-900"
                        : "bg-blue-200 text-blue-900"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-2">
                  {(r.status === "active" || r.status === "trialing") && (
                    <Button size="sm" onClick={() => cancel(r.id)} className="border-2 border-ink bg-destructive text-destructive-foreground">
                      Cancel
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
