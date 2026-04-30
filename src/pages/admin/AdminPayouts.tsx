import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminShell from "./AdminShell";
import { Button } from "@/components/ui/button";
import { logAdminAction } from "@/lib/adminAudit";
import { toast } from "sonner";

interface Payout {
  id: string;
  coach_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  requested_at: string;
  paid_at: string | null;
  coach_name: string;
}
interface Account {
  id: string;
  coach_id: string;
  provider: string;
  bank_name: string | null;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  coach_name: string;
}

const useCoachNames = (ids: string[]) =>
  useQuery({
    queryKey: ["coach-names", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      return new Map((data ?? []).map((d) => [d.id, d.display_name]));
    },
  });

export default function AdminPayouts() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"requests" | "accounts">("requests");

  const { data: payoutRows = [] } = useQuery<Payout[]>({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const { data } = await supabase.from("payouts").select("*").order("requested_at", { ascending: false }).limit(500);
      return (data ?? []) as unknown as Payout[];
    },
  });
  const payoutNames = useCoachNames(Array.from(new Set(payoutRows.map((p) => p.coach_id))));
  const payouts = payoutRows.map((p) => ({ ...p, coach_name: payoutNames.data?.get(p.coach_id) ?? "—" }));

  const { data: accountRows = [] } = useQuery<Account[]>({
    queryKey: ["admin-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("coach_payout_accounts").select("*").limit(500);
      return (data ?? []) as unknown as Account[];
    },
  });
  const acctNames = useCoachNames(Array.from(new Set(accountRows.map((a) => a.coach_id))));
  const accounts = accountRows.map((a) => ({ ...a, coach_name: acctNames.data?.get(a.coach_id) ?? "—" }));

  const markPaid = async (id: string) => {
    if (!confirm("Mark this payout as paid?")) return;
    const { error } = await supabase.from("payouts").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: "payout.mark_paid", target_table: "payouts", target_id: id });
    toast.success("Marked paid");
    qc.invalidateQueries({ queryKey: ["admin-payouts"] });
  };

  return (
    <AdminShell title="Payouts">
      <div className="mb-4 flex gap-2">
        {(["requests", "accounts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase ${tab === t ? "bg-ink text-ink-foreground" : "bg-surface"}`}
          >
            {t === "requests" ? "Payout requests" : "Bank accounts"}
          </button>
        ))}
      </div>

      {tab === "requests" ? (
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-ink-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Coach</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Requested</th>
                <th className="px-3 py-2 text-left">Paid</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p, i) => (
                <tr key={p.id} className={`border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"}`}>
                  <td className="px-3 py-2">{p.coach_name}</td>
                  <td className="px-3 py-2">${(p.amount_cents / 100).toFixed(2)} {p.currency.toUpperCase()}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${p.status === "paid" ? "bg-green-200 text-green-900" : "bg-yellow-200 text-yellow-900"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(p.requested_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                  <td className="px-3 py-2">
                    {p.status === "pending" && (
                      <Button size="sm" onClick={() => markPaid(p.id)} className="border-2 border-ink bg-accent text-ink">
                        Mark paid
                      </Button>
                    )}
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
                <th className="px-3 py-2 text-left">Coach</th>
                <th className="px-3 py-2 text-left">Provider</th>
                <th className="px-3 py-2 text-left">Bank</th>
                <th className="px-3 py-2 text-left">Holder</th>
                <th className="px-3 py-2 text-left">Account #</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a, i) => (
                <tr key={a.id} className={`border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"}`}>
                  <td className="px-3 py-2">{a.coach_name}</td>
                  <td className="px-3 py-2">{a.provider}</td>
                  <td className="px-3 py-2">{a.bank_name ?? "—"}</td>
                  <td className="px-3 py-2">{a.bank_account_holder ?? "—"}</td>
                  <td className="px-3 py-2">{a.bank_account_number ? `••••${a.bank_account_number.slice(-4)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
