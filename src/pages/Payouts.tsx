import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Banknote, CheckCircle2, Clock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

const MIN_PAYOUT_IDR_CENTS = 25_000_000; // Rp 250.000

type PayoutAccount = Database["public"]["Tables"]["coach_payout_accounts"]["Row"];
type Payout = Database["public"]["Tables"]["payouts"]["Row"];
type Schedule = "weekly" | "biweekly" | "monthly";

const Payouts = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [bank, setBank] = useState({ name: "", account: "", holder: "" });
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: account } = useQuery<PayoutAccount | null>({
    queryKey: ["payout-account", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_payout_accounts")
        .select("*")
        .eq("coach_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  const { data: payoutHistory = [] } = useQuery<Payout[]>({
    queryKey: ["payouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("coach_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: balance = 0, refetch: refetchBalance } = useQuery<number>({
    queryKey: ["coach-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("coach_balances")
        .select("available_idr_cents")
        .eq("coach_id", user!.id)
        .maybeSingle();
      return Number(data?.available_idr_cents ?? 0);
    },
  });

  const requestPayout = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("request-xendit-payout", { body: {} });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data;
    },
    onSuccess: () => {
      toast.success("Payout requested — processing");
      queryClient.invalidateQueries({ queryKey: ["payouts", user?.id] });
      refetchBalance();
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't request payout"),
  });

  const scheduleMutation = useMutation({
    mutationFn: async (schedule: Schedule) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("coach_payout_accounts")
        .upsert({ coach_id: user.id, payout_schedule: schedule }, { onConflict: "coach_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-account", user?.id] });
      toast.success("Schedule updated");
    },
    onError: () => toast.error("Couldn't update schedule"),
  });

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!bank.name || !bank.account || !bank.holder) {
      toast.error("Fill in your bank details");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("coach_payout_accounts").upsert({
      coach_id: user.id,
      bank_name: bank.name,
      bank_account_number: bank.account,
      bank_account_holder: bank.holder,
    }, { onConflict: "coach_id" });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save payout account");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["payout-account", user?.id] });
    setEditMode(false);
    setBank({ name: "", account: "", holder: "" });
    toast.success("Payout account connected");
  };

  const totalEarned = payoutHistory.reduce((s, p) => s + p.amount_cents, 0);
  const pendingAmount = payoutHistory
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((s, p) => s + p.amount_cents, 0);

  const connected = !!account?.bank_account_number && !editMode;
  const currentSchedule = (account?.payout_schedule ?? "monthly") as Schedule;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Studio
        </Link>

        <header className="mt-4 mb-8">
          <span className="brutal-tag mb-3"><Banknote className="h-3 w-3" /> Payouts</span>
          <h1 className="font-display text-3xl md:text-5xl">Get paid</h1>
          <p className="mt-2 text-muted-foreground">Connect a bank or e-wallet, set a schedule, ship.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="brutal-card-sm p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Lifetime earned</div>
            <div className="mt-2 font-display text-xl">{formatCurrency(totalEarned)}</div>
          </div>
          <div className="brutal-card-sm p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Pending</div>
            <div className="mt-2 font-display text-xl">{formatCurrency(pendingAmount)}</div>
          </div>
          <div className="brutal-card-sm p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Schedule</div>
            <div className="mt-2 font-display text-2xl capitalize">{currentSchedule}</div>
          </div>
        </section>

        <section className="brutal-card mt-8 p-5">
          <h2 className="font-display text-xl">Payout account</h2>
          {connected ? (
            <div className="mt-4 flex items-center gap-3 border-2 border-ink bg-primary/10 p-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <div>
                <div className="font-semibold">{account.bank_name} · ••••{account.bank_account_number?.slice(-4)}</div>
                <div className="text-xs text-muted-foreground">{account.bank_account_holder}</div>
              </div>
              <Button onClick={() => { setEditMode(true); setBank({ name: account.bank_name ?? "", account: account.bank_account_number ?? "", holder: account.bank_account_holder ?? "" }); }}
                variant="outline" className="ml-auto border-2 border-ink bg-surface">Edit</Button>
            </div>
          ) : (
            <form onSubmit={connect} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <input value={bank.name} onChange={(e) => setBank({ ...bank, name: e.target.value })}
                  placeholder="Bank name (e.g. BCA, Mandiri)"
                  className="border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
                <input value={bank.account} onChange={(e) => setBank({ ...bank, account: e.target.value })}
                  placeholder="Account number" inputMode="numeric"
                  className="border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
                <input value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value })}
                  placeholder="Account holder name"
                  className="border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}
                  className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
                  {saving ? "Saving…" : "Connect account"}
                </Button>
                {editMode && (
                  <Button type="button" variant="outline" onClick={() => setEditMode(false)}
                    className="border-2 border-ink bg-surface">Cancel</Button>
                )}
              </div>
            </form>
          )}
        </section>

        <section className="brutal-card-sm mt-6 p-5">
          <h2 className="font-display text-xl">Schedule</h2>
          <div className="mt-3 flex gap-1">
            {(["weekly", "biweekly", "monthly"] as Schedule[]).map((s) => (
              <button key={s} onClick={() => scheduleMutation.mutate(s)} className={cn(
                "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                currentSchedule === s ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
              )}>{s}</button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Payout history</h2>
          {payoutHistory.length === 0 ? (
            <div className="brutal-card mt-4 p-10 text-center">
              <p className="font-display text-xl">No payouts yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Earn first, get paid second.</p>
            </div>
          ) : (
            <div className="brutal-card mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="border-b-2 border-ink px-4 py-3">Date</th>
                    <th className="border-b-2 border-ink px-4 py-3">Amount</th>
                    <th className="border-b-2 border-ink px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map((p) => (
                    <tr key={p.id} className="border-b-2 border-ink/10 last:border-0">
                      <td className="px-4 py-3">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(p.amount_cents)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide">
                          {p.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Clock className="h-3.5 w-3.5" />}
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export default Payouts;
