import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "trialing" | "canceled" | "past_due";

interface SubRow {
  id: string;
  mentee_name: string;
  mentee_handle: string;
  coach_name: string;
  coach_handle: string;
  tier_name: string;
  status: string;
  created_at: string;
}

const AdminSubscriptions = () => {
  const { user: adminUser } = useSession();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data: subs = [], isLoading } = useQuery<SubRow[]>({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, status, created_at, mentee_id, coach_id, subscription_tiers(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!data?.length) return [];

      const allIds = [...new Set([...data.map((s) => s.mentee_id), ...data.map((s) => s.coach_id)])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, handle")
        .in("id", allIds);

      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));
      return data.map((s) => {
        const mentee = pm.get(s.mentee_id);
        const coach = pm.get(s.coach_id);
        const tier = s.subscription_tiers as unknown as { name: string } | null;
        return {
          id: s.id,
          mentee_name: mentee?.display_name ?? "—",
          mentee_handle: mentee?.handle ?? "",
          coach_name: coach?.display_name ?? "—",
          coach_handle: coach?.handle ?? "",
          tier_name: tier?.name ?? "—",
          status: s.status,
          created_at: s.created_at,
        };
      });
    },
  });

  const cancelSub = useMutation({
    mutationFn: async (subId: string) => {
      await supabase.from("subscriptions").update({ status: "canceled" }).eq("id", subId);
      await supabase.from("admin_audit_log").insert({
        admin_id: adminUser!.id,
        action: "cancel_subscription",
        target_table: "subscriptions",
        target_id: subId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast.success("Subscription canceled");
    },
  });

  const STATUSES: StatusFilter[] = ["all", "active", "trialing", "canceled", "past_due"];

  const filtered = subs.filter((s) => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchSearch =
      s.mentee_name.toLowerCase().includes(search.toLowerCase()) ||
      s.coach_name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    trialing: "bg-blue-100 text-blue-800",
    canceled: "bg-red-100 text-red-800",
    past_due: "bg-yellow-100 text-yellow-800",
  };

  return (
    <AdminShell>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-2xl">All Subscriptions ({subs.length})</h2>
          <input
            className="brutal-input w-full sm:w-64"
            placeholder="Search mentee or coach…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "brutal-tag text-xs capitalize",
                statusFilter === s ? "bg-ink text-ink-foreground" : "",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
      ) : (
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-ink-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Mentee</th>
                <th className="px-3 py-2 text-left">Coach</th>
                <th className="px-3 py-2 text-left">Tier</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Since</th>
                <th className="px-3 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={cn("border-t border-ink/30", i % 2 === 0 ? "bg-surface" : "bg-background")}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{s.mentee_name}</p>
                    <p className="text-xs text-muted-foreground">@{s.mentee_handle}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{s.coach_name}</p>
                    <p className="text-xs text-muted-foreground">@{s.coach_handle}</p>
                  </td>
                  <td className="px-3 py-2">{s.tier_name}</td>
                  <td className="px-3 py-2">
                    <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold uppercase", statusColor[s.status] ?? "bg-muted")}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {s.status !== "canceled" && (
                      <button
                        onClick={() => { if (confirm("Cancel this subscription?")) cancelSub.mutate(s.id); }}
                        className="brutal-tag text-xs text-destructive"
                      >
                        Cancel
                      </button>
                    )}
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

export default AdminSubscriptions;
