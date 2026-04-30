import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PayoutRow {
  id: string;
  coach_name: string;
  coach_handle: string;
  amount_cents: number;
  currency: string;
  status: string;
  requested_at: string;
  paid_at: string | null;
}

interface PayoutAccountRow {
  id: string;
  coach_name: string;
  coach_handle: string;
  provider: string;
  account_number: string | null;
  bank_name: string | null;
  account_name: string | null;
}

const AdminPayouts = () => {
  const { user: adminUser } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"payouts" | "accounts">("payouts");

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<PayoutRow[]>({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payouts")
        .select("id, coach_id, amount_cents, currency, status, requested_at, paid_at")
        .order("requested_at", { ascending: false })
        .limit(500);
      if (!data?.length) return [];

      const coachIds = [...new Set(data.map((p) => p.coach_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, handle").in("id", coachIds);
      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));

      return data.map((p) => {
        const coach = pm.get(p.coach_id);
        return {
          id: p.id,
          coach_name: coach?.display_name ?? "—",
          coach_handle: coach?.handle ?? "",
          amount_cents: p.amount_cents,
          currency: p.currency,
          status: p.status,
          requested_at: p.requested_at,
          paid_at: p.paid_at,
        };
      });
    },
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<PayoutAccountRow[]>({
    queryKey: ["admin-payout-accounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_payout_accounts")
        .select("id, coach_id, provider, account_number, bank_name, account_name")
        .order("id", { ascending: true });
      if (!data?.length) return [];

      const coachIds = [...new Set(data.map((a) => a.coach_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, handle").in("id", coachIds);
      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));

      return data.map((a) => {
        const coach = pm.get(a.coach_id);
        return {
          id: a.id,
          coach_name: coach?.display_name ?? "—",
          coach_handle: coach?.handle ?? "",
          provider: a.provider,
          account_number: a.account_number,
          bank_name: a.bank_name,
          account_name: a.account_name,
        };
      });
    },
  });

  const markPaid = useMutation({
    mutationFn: async (payoutId: string) => {
      await supabase
        .from("payouts")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", payoutId);
      await supabase.from("admin_audit_log").insert({
        admin_id: adminUser!.id,
        action: "mark_payout_paid",
        target_table: "payouts",
        target_id: payoutId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      toast.success("Payout marked as paid");
    },
  });

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <AdminShell>
      <h2 className="mb-4 font-display text-2xl">Payouts</h2>

      <div className="mb-4 flex gap-1">
        {(["payouts", "accounts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "border-2 border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide",
              tab === t ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/40",
            )}
          >
            {t === "payouts" ? "Payout Requests" : "Bank Accounts"}
          </button>
        ))}
      </div>

      {tab === "payouts" && (
        payoutsLoading ? (
          <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto border-2 border-ink">
            <table className="w-full text-sm">
              <thead className="bg-ink text-ink-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Coach</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Requested</th>
                  <th className="px-3 py-2 text-left">Paid</th>
                  <th className="px-3 py-2 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => (
                  <tr key={p.id} className={cn("border-t border-ink/30", i % 2 === 0 ? "bg-surface" : "bg-background")}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{p.coach_name}</p>
                      <p className="text-xs text-muted-foreground">@{p.coach_handle}</p>
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {(p.amount_cents / 100).toLocaleString("en-US", { style: "currency", currency: p.currency.toUpperCase() })}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold uppercase", statusColor[p.status] ?? "bg-muted")}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(p.requested_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {p.status === "pending" && (
                        <button
                          onClick={() => markPaid.mutate(p.id)}
                          className="brutal-tag text-xs"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "accounts" && (
        accountsLoading ? (
          <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto border-2 border-ink">
            <table className="w-full text-sm">
              <thead className="bg-ink text-ink-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Coach</th>
                  <th className="px-3 py-2 text-left">Provider</th>
                  <th className="px-3 py-2 text-left">Bank</th>
                  <th className="px-3 py-2 text-left">Account Name</th>
                  <th className="px-3 py-2 text-left">Account No.</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a, i) => (
                  <tr key={a.id} className={cn("border-t border-ink/30", i % 2 === 0 ? "bg-surface" : "bg-background")}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{a.coach_name}</p>
                      <p className="text-xs text-muted-foreground">@{a.coach_handle}</p>
                    </td>
                    <td className="px-3 py-2 uppercase">{a.provider}</td>
                    <td className="px-3 py-2">{a.bank_name ?? "—"}</td>
                    <td className="px-3 py-2">{a.account_name ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.account_number ?? "—"}</td>
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

export default AdminPayouts;
