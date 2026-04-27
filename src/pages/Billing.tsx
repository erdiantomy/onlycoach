import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { coaches, payments, paymentMethods, type PaymentMethod } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, CreditCard, Download, Plus, Wallet } from "lucide-react";
import { cn, formatIdr } from "@/lib/utils";
import { toast } from "sonner";

const methodIcon: Record<PaymentMethod["kind"], React.ComponentType<{ className?: string }>> = {
  GoPay: Wallet,
  OVO: Wallet,
  VA: CreditCard,
  Card: CreditCard,
};

const Billing = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>(paymentMethods);
  const subscribed = coaches.slice(0, 2);

  const setDefault = (id: string) => {
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
    toast.success("Default payment method updated");
  };

  const remove = (id: string) => {
    const m = methods.find((x) => x.id === id);
    if (m?.isDefault) {
      toast.error("Pick another default before removing this one.");
      return;
    }
    setMethods((prev) => prev.filter((x) => x.id !== id));
    toast.success("Removed");
  };

  const exportCsv = () => {
    const header = ["Date", "Description", "Amount (IDR)", "Status", "Method"];
    const lines = payments.map((p) => [
      p.date,
      p.description.replace(/,/g, ";"),
      Math.round(p.amount * 16000).toString(),
      p.status,
      p.method,
    ].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "billing.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/me" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Profile
        </Link>

        <header className="mt-4 mb-8">
          <span className="brutal-tag mb-3"><CreditCard className="h-3 w-3" /> Billing</span>
          <h1 className="font-display text-3xl md:text-5xl">Subscriptions, payments &amp; methods</h1>
        </header>

        <section className="brutal-card-sm p-5">
          <h2 className="font-display text-xl">Active subscriptions</h2>
          {subscribed.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No active subscriptions.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {subscribed.map((c) => {
                const tier = c.tiers[1] ?? c.tiers[0];
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 border-b-2 border-ink/10 pb-2 last:border-0 last:pb-0">
                    <div>
                      <Link to={`/coach/${c.handle}`} className="font-semibold hover:underline">{c.name}</Link>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {tier.name} · renews monthly
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display">{formatIdr(tier.price)}<span className="text-xs">/mo</span></div>
                      <Link to={`/coach/${c.handle}`} className="text-xs uppercase tracking-wide underline-offset-4 hover:underline">
                        Manage
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="brutal-card mt-6 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Payment methods</h2>
            <Button variant="outline" onClick={() => toast.success("Add method modal would open here")}
              className="border-2 border-ink bg-surface">
              <Plus className="mr-1.5 h-4 w-4" /> Add
            </Button>
          </div>
          {methods.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Add a method to enable subscriptions and bookings.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {methods.map((m) => {
                const Icon = methodIcon[m.kind];
                return (
                  <li key={m.id} className="flex items-center gap-3 border-b-2 border-ink/10 pb-2 last:border-0 last:pb-0">
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink",
                      m.isDefault ? "bg-primary text-primary-foreground" : "bg-surface",
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{m.label}</div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{m.kind}</div>
                    </div>
                    {m.isDefault ? (
                      <span className="inline-flex items-center gap-1 border-2 border-ink bg-primary/10 px-2 py-1 text-xs uppercase">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Default
                      </span>
                    ) : (
                      <button onClick={() => setDefault(m.id)}
                        className="border-2 border-ink bg-surface px-2 py-1 text-xs uppercase hover:bg-accent/50">
                        Make default
                      </button>
                    )}
                    {!m.isDefault && (
                      <button onClick={() => remove(m.id)}
                        className="text-xs uppercase tracking-wide text-muted-foreground hover:text-destructive">
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Payment history</h2>
            <Button onClick={exportCsv} variant="outline"
              className="border-2 border-ink bg-surface">
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
          </div>
          {payments.length === 0 ? (
            <div className="brutal-card mt-4 p-10 text-center">
              <p className="font-display text-xl">No payments yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Subscribe to a coach to see receipts here.</p>
            </div>
          ) : (
            <div className="brutal-card mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="border-b-2 border-ink px-4 py-3">Date</th>
                    <th className="border-b-2 border-ink px-4 py-3">Description</th>
                    <th className="border-b-2 border-ink px-4 py-3">Method</th>
                    <th className="border-b-2 border-ink px-4 py-3 text-right">Amount</th>
                    <th className="border-b-2 border-ink px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b-2 border-ink/10 last:border-0">
                      <td className="px-4 py-3">{p.date}</td>
                      <td className="px-4 py-3">{p.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatIdr(p.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-block border-2 border-ink px-2 py-0.5 text-xs uppercase",
                          p.status === "paid" && "bg-primary/10",
                          p.status === "failed" && "bg-destructive/10 text-destructive",
                          p.status === "refunded" && "bg-accent/30",
                          p.status === "pending" && "bg-surface",
                        )}>{p.status}</span>
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

export default Billing;
