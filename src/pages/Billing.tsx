import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ManageOnWebNotice } from "@/components/ManageOnWebNotice";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { cancelSubscription } from "@/lib/checkout";
import { isCheckoutBlockedOnDevice } from "@/lib/checkout";

type SubRow = {
  id: string;
  coachId: string;
  coachHandle: string;
  coachName: string;
  tierName: string;
  priceCents: number;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: "stripe" | "xendit";
};

const Billing = () => {
  const { user } = useSession();
  const qc = useQueryClient();
  const blocked = isCheckoutBlockedOnDevice();

  const { data: subs = [], isLoading } = useQuery<SubRow[]>({
    queryKey: ["billing-subs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, coach_id, status, current_period_end, cancel_at_period_end, payment_provider, subscription_tiers(name, price_cents)")
        .eq("mentee_id", user!.id)
        .order("created_at", { ascending: false });

      const rows = data ?? [];
      if (rows.length === 0) return [];
      const coachIds = [...new Set(rows.map((r) => r.coach_id))];
      const profilesRes = await supabase
        .from("profiles")
        .select("id, display_name, handle")
        .in("id", coachIds);
      const pm = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));

      return rows.map((r) => {
        const tier = r.subscription_tiers as { name: string; price_cents: number } | null;
        const cp = pm.get(r.coach_id);
        return {
          id: r.id,
          coachId: r.coach_id,
          coachHandle: cp?.handle ?? "",
          coachName: cp?.display_name ?? "Coach",
          tierName: tier?.name ?? "Tier",
          priceCents: tier?.price_cents ?? 0,
          status: r.status,
          currentPeriodEnd: r.current_period_end,
          cancelAtPeriodEnd: r.cancel_at_period_end,
          provider: (r.payment_provider as "stripe" | "xendit") ?? "stripe",
        };
      });
    },
  });

  const cancelMut = useMutation({
    mutationFn: async (row: SubRow) => cancelSubscription(row.coachId, row.provider),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["billing-subs", user?.id] });
      const until = (data as { access_until?: string | null })?.access_until;
      toast.success(until ? `Canceled. Access until ${new Date(until).toLocaleDateString()}.` : "Canceled.");
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Couldn't cancel"),
  });

  const handleCancel = (row: SubRow) => {
    if (!window.confirm(`Cancel your ${row.tierName} subscription to ${row.coachName}? You'll keep access until the end of the current period.`)) return;
    cancelMut.mutate(row);
  };

  const active = subs.filter((s) => s.status === "active" || s.status === "trialing" || (s.status === "canceled" && s.currentPeriodEnd && new Date(s.currentPeriodEnd) > new Date()));
  const inactive = subs.filter((s) => !active.includes(s));

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
        <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        <header className="mt-4 mb-8">
          <span className="brutal-tag mb-3"><CreditCard className="h-3 w-3" /> Billing</span>
          <h1 className="font-display text-3xl md:text-5xl">Billing</h1>
          <p className="mt-2 text-muted-foreground">Active subscriptions and cancellations.</p>
        </header>

        {blocked && <ManageOnWebNotice className="mb-6" />}

        {isLoading ? (
          <div className="brutal-card p-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <>
            <section>
              <h2 className="font-display text-xl">Active subscriptions</h2>
              {active.length === 0 ? (
                <div className="brutal-card mt-3 p-6 text-center">
                  <p className="font-display text-lg">No active subscriptions.</p>
                  <Link to="/discover" className="mt-3 inline-block border-2 border-ink bg-accent px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-brutal-sm">
                    Discover coaches
                  </Link>
                </div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {active.map((s) => (
                    <li key={s.id} className="brutal-card p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="h-12 w-12 border-2 border-ink bg-primary" />
                        <div className="flex-1 min-w-0">
                          <Link to={`/coach/${s.coachHandle}`} className="font-display text-lg hover:underline">
                            {s.coachName}
                          </Link>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            {s.tierName} · {formatCurrency(s.priceCents)}/mo · {s.provider}
                          </div>
                        </div>
                        <span className={`brutal-tag ${s.cancelAtPeriodEnd || s.status === "canceled" ? "bg-yellow-200" : "bg-accent"}`}>
                          {s.cancelAtPeriodEnd || s.status === "canceled" ? "Ending" : "Active"}
                        </span>
                      </div>
                      {s.currentPeriodEnd && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {s.cancelAtPeriodEnd || s.status === "canceled" ? "Access until" : "Renews"}{" "}
                          {new Date(s.currentPeriodEnd).toLocaleDateString()}
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Link
                          to={`/coach/${s.coachHandle}`}
                          className="inline-flex items-center gap-1 border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                        >
                          View coach <ExternalLink className="h-3 w-3" />
                        </Link>
                        {!s.cancelAtPeriodEnd && s.status !== "canceled" && (
                          <button
                            onClick={() => handleCancel(s)}
                            disabled={cancelMut.isPending}
                            className="border-2 border-ink bg-destructive px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-destructive-foreground disabled:opacity-60"
                          >
                            {cancelMut.isPending ? "Canceling…" : "Cancel"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {inactive.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-xl">Past subscriptions</h2>
                <ul className="mt-3 space-y-2">
                  {inactive.map((s) => (
                    <li key={s.id} className="brutal-card-sm flex items-center gap-3 p-3 opacity-75">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{s.coachName}</div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          {s.tierName} · {s.status}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="mt-8 text-xs text-muted-foreground">
              Need an invoice or refund? Email support — we'll sort it.
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Billing;
