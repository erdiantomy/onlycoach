// Xendit webhook handler — invoice.paid, recurring.* events.
// Mirrors stripe payments-webhook side-effects (subscriber count, auto-DM, welcome email).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Verify webhook token
  const expected = Deno.env.get("XENDIT_WEBHOOK_TOKEN");
  const got = req.headers.get("x-callback-token");
  if (!expected || got !== expected) {
    console.error("xendit-webhook: bad token");
    return new Response("Unauthorized", { status: 401 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE);

  let event: any;
  try { event = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  try {
    // Xendit sends different shapes per event type. Detect by fields.
    // 1. Invoice paid (one-time booking)
    if (event.status === "PAID" && event.metadata?.booking_kind === "session") {
      const m = event.metadata;
      // Mark slot booked
      await admin.from("availability_slots").update({ is_booked: true }).eq("id", m.slot_id);
      // Look up slot for booking record
      const { data: slot } = await admin
        .from("availability_slots")
        .select("starts_at, duration_min, price_cents")
        .eq("id", m.slot_id)
        .maybeSingle();
      if (slot) {
        await admin.from("bookings").insert({
          mentee_id: m.mentee_id,
          coach_id: m.coach_id,
          slot_id: m.slot_id,
          starts_at: slot.starts_at,
          duration_min: slot.duration_min,
          price_cents: slot.price_cents,
          status: "confirmed",
          payment_provider: "xendit",
          xendit_invoice_id: event.id,
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // 2. Recurring plan activated → first cycle succeeded → create/update subscription
    const evType = event.event ?? event.type;
    const plan = event.data ?? event;
    const meta = plan.metadata ?? event.metadata ?? {};

    if (evType === "recurring.plan.activated" || evType === "recurring.cycle.succeeded") {
      if (!meta.mentee_id || !meta.coach_id || !meta.tier_id) {
        console.warn("xendit-webhook: missing metadata", evType);
        return new Response(JSON.stringify({ ok: true, ignored: "no-metadata" }), { status: 200 });
      }
      const periodEnd = plan.next_action_at ?? plan.next_payment_at
        ? new Date(plan.next_action_at ?? plan.next_payment_at).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Upsert subscription
      const { data: existing } = await admin
        .from("subscriptions")
        .select("id, status")
        .eq("xendit_recurring_plan_id", plan.id ?? plan.plan_id)
        .maybeSingle();

      const wasNew = !existing || existing.status !== "active";

      if (existing) {
        await admin.from("subscriptions").update({
          status: "active",
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await admin.from("subscriptions").insert({
          mentee_id: meta.mentee_id,
          coach_id: meta.coach_id,
          tier_id: meta.tier_id,
          status: "active",
          payment_provider: "xendit",
          xendit_recurring_plan_id: plan.id ?? plan.plan_id,
          xendit_customer_id: plan.customer_id,
          current_period_end: periodEnd,
        });
      }

      // Side-effects on first activation only
      if (wasNew) {
        // Increment subscriber count
        const { data: cp } = await admin.from("coach_profiles").select("subscriber_count").eq("user_id", meta.coach_id).maybeSingle();
        if (cp) {
          await admin.from("coach_profiles").update({ subscriber_count: (cp.subscriber_count ?? 0) + 1 }).eq("user_id", meta.coach_id);
        }
        // Auto-create DM conversation
        const { data: convo } = await admin
          .from("conversations")
          .select("id")
          .eq("mentee_id", meta.mentee_id)
          .eq("coach_id", meta.coach_id)
          .maybeSingle();
        if (!convo) {
          await admin.from("conversations").insert({ mentee_id: meta.mentee_id, coach_id: meta.coach_id });
        }
        // TODO: welcome email via Resend connector (same as stripe handler)
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (evType === "recurring.plan.inactivated" || evType === "recurring.cycle.failed") {
      await admin
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("xendit_recurring_plan_id", plan.id ?? plan.plan_id);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    console.log("xendit-webhook: unhandled", evType);
    return new Response(JSON.stringify({ ok: true, ignored: evType }), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    console.error("xendit-webhook error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
