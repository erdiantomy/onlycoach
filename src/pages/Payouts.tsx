import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { payouts } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Banknote, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn, formatIdr } from "@/lib/utils";

type Schedule = "weekly" | "biweekly" | "monthly";

const Payouts = () => {
  const [connected, setConnected] = useState(false);
  const [bank, setBank] = useState({ name: "", account: "", holder: "" });
  const [schedule, setSchedule] = useState<Schedule>("monthly");
  const [minPayout, setMinPayout] = useState(100);

  const totalEarned = payouts.reduce((s, p) => s + p.amount, 0);

  const connect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bank.name || !bank.account || !bank.holder) {
      toast.error("Fill in your bank details");
      return;
    }
    setConnected(true);
    toast.success("Payout account connected");
  };

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
            <div className="mt-2 font-display text-xl">{formatIdr(totalEarned)}</div>
          </div>
          <div className="brutal-card-sm p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Pending</div>
            <div className="mt-2 font-display text-xl">{formatIdr(240)}</div>
          </div>
          <div className="brutal-card-sm p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Next payout</div>
            <div className="mt-2 font-display text-2xl">May 01</div>
          </div>
        </section>

        <section className="brutal-card mt-8 p-5">
          <h2 className="font-display text-xl">Payout account</h2>
          {connected ? (
            <div className="mt-4 flex items-center gap-3 border-2 border-ink bg-primary/10 p-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <div>
                <div className="font-semibold">{bank.name} · ••••{bank.account.slice(-4)}</div>
                <div className="text-xs text-muted-foreground">{bank.holder}</div>
              </div>
              <Button onClick={() => setConnected(false)} variant="outline"
                className="ml-auto border-2 border-ink bg-surface">Edit</Button>
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
              <Button type="submit"
                className="border-2 border-ink bg-ink text-ink-foreground shadow-brutal-sm hover:bg-ink/90">
                Connect account
              </Button>
            </form>
          )}
        </section>

        <section className="brutal-card-sm mt-6 p-5">
          <h2 className="font-display text-xl">Schedule</h2>
          <div className="mt-3 flex gap-1">
            {(["weekly", "biweekly", "monthly"] as Schedule[]).map((s) => (
              <button key={s} onClick={() => { setSchedule(s); toast.success(`Switched to ${s} payouts`); }} className={cn(
                "border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                schedule === s ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/50",
              )}>{s}</button>
            ))}
          </div>
          <div className="mt-4">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Minimum payout (IDR ‘000)
            </label>
            <input type="number" min={100} step={50} value={minPayout} onChange={(e) => setMinPayout(Number(e.target.value))}
              className="mt-1 w-32 border-2 border-ink bg-surface px-3 py-2 text-sm focus:outline-none" />
            <p className="mt-1 text-xs text-muted-foreground">Currently {formatIdr(minPayout)}</p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Payout history</h2>
          {payouts.length === 0 ? (
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
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b-2 border-ink/10 last:border-0">
                      <td className="px-4 py-3">{p.date}</td>
                      <td className="px-4 py-3 font-semibold">{formatIdr(p.amount)}</td>
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
