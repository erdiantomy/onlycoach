import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Receipt, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

type Side = "earned" | "spent";
type SourceFilter = "all" | "subscription" | "booking" | "challenge";

interface RevenueRow {
  id: string;
  occurred_at: string;
  source: string;
  gross_idr_cents: number;
  platform_fee_idr_cents: number;
  coach_net_idr_cents: number;
  payment_provider: string;
  external_ref: string | null;
  coach_id: string;
  mentee_id: string | null;
}

interface PayoutRow {
  id: string;
  created_at: string;
  amount_cents: number;
  status: string;
  failure_reason: string | null;
}

const Transactions = () => {
  const { user } = useSession();
  const [side, setSide] = useState<Side>("earned");
  const [source, setSource] = useState<SourceFilter>("all");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();

  const { data: events = [], isLoading } = useQuery<RevenueRow[]>({
    queryKey: ["tx-events", user?.id, side, source, from?.toISOString(), to?.toISOString()],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("revenue_events").select("*").order("occurred_at", { ascending: false }).limit(200);
      q = side === "earned" ? q.eq("coach_id", user!.id) : q.eq("mentee_id", user!.id);
      if (source !== "all") q = q.eq("source", source);
      if (from) q = q.gte("occurred_at", from.toISOString());
      if (to) q = q.lte("occurred_at", new Date(to.getTime() + 86400000).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RevenueRow[];
    },
  });

  const { data: payouts = [] } = useQuery<PayoutRow[]>({
    queryKey: ["tx-payouts", user?.id],
    enabled: !!user && side === "earned",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("id,created_at,amount_cents,status,failure_reason")
        .eq("coach_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as PayoutRow[];
    },
  });

  const totals = useMemo(() => {
    const gross = events.reduce((s, e) => s + Number(e.gross_idr_cents), 0);
    const fee = events.reduce((s, e) => s + Number(e.platform_fee_idr_cents), 0);
    const net = events.reduce((s, e) => s + Number(e.coach_net_idr_cents), 0);
    return { gross, fee, net };
  }, [events]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/me" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <header className="mt-4 mb-6">
          <span className="brutal-tag mb-3"><Receipt className="h-3 w-3" /> History</span>
          <h1 className="font-display text-3xl md:text-5xl">Transactions</h1>
          <p className="mt-2 text-muted-foreground">Every rupiah in and out.</p>
        </header>

        <Tabs value={side} onValueChange={(v) => setSide(v as Side)} className="mb-4">
          <TabsList className="border-2 border-ink">
            <TabsTrigger value="earned">Earned (as coach)</TabsTrigger>
            <TabsTrigger value="spent">Spent (as mentee)</TabsTrigger>
          </TabsList>
        </Tabs>

        <section className="mb-4 flex flex-wrap items-center gap-2">
          {(["all", "subscription", "booking", "challenge"] as SourceFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                source === s ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
              )}
            >
              {s}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <DateBtn label="From" value={from} onChange={setFrom} />
            <DateBtn label="To" value={to} onChange={setTo} />
            {(from || to) && (
              <Button variant="outline" size="sm" onClick={() => { setFrom(undefined); setTo(undefined); }} className="border-2 border-ink">Clear</Button>
            )}
          </div>
        </section>

        {side === "earned" && (
          <section className="mb-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Gross" value={formatCurrency(totals.gross)} />
            <Stat label="Platform fee (10%)" value={formatCurrency(totals.fee)} />
            <Stat label="Net to you" value={formatCurrency(totals.net)} />
          </section>
        )}

        <section className="brutal-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="border-b-2 border-ink px-4 py-3">Date</th>
                <th className="border-b-2 border-ink px-4 py-3">Source</th>
                <th className="border-b-2 border-ink px-4 py-3">Provider</th>
                <th className="border-b-2 border-ink px-4 py-3 text-right">Gross</th>
                {side === "earned" && <th className="border-b-2 border-ink px-4 py-3 text-right">Fee</th>}
                <th className="border-b-2 border-ink px-4 py-3 text-right">{side === "earned" ? "Net" : "Paid"}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No transactions in this range.</td></tr>
              ) : events.map((e) => (
                <tr key={e.id} className="border-b-2 border-ink/10 last:border-0">
                  <td className="px-4 py-3">{format(new Date(e.occurred_at), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3 capitalize">{e.source}</td>
                  <td className="px-4 py-3 uppercase text-xs">{e.payment_provider}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(Number(e.gross_idr_cents))}</td>
                  {side === "earned" && <td className="px-4 py-3 text-right text-muted-foreground">−{formatCurrency(Number(e.platform_fee_idr_cents))}</td>}
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(side === "earned" ? Number(e.coach_net_idr_cents) : Number(e.gross_idr_cents))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {side === "earned" && payouts.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl mb-3">Payouts</h2>
            <div className="brutal-card overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="border-b-2 border-ink px-4 py-3">Date</th>
                    <th className="border-b-2 border-ink px-4 py-3">Amount</th>
                    <th className="border-b-2 border-ink px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b-2 border-ink/10 last:border-0">
                      <td className="px-4 py-3">{format(new Date(p.created_at), "dd MMM yyyy")}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(p.amount_cents)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs uppercase tracking-wide">{p.status}</span>
                        {p.failure_reason && <div className="text-xs text-destructive">{p.failure_reason}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="brutal-card-sm p-4">
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-2 font-display text-xl">{value}</div>
  </div>
);

const DateBtn = ({ label, value, onChange }: { label: string; value?: Date; onChange: (d?: Date) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className={cn("border-2 border-ink", !value && "text-muted-foreground")}>
        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
        {value ? format(value, "dd MMM yyyy") : label}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="end">
      <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
    </PopoverContent>
  </Popover>
);

export default Transactions;
