// Xendit webhook handler — invoice.paid, recurring.* events.
// HARDENED: idempotent at three layers
//   1. Event-level dedup via processed_webhook_events table (atomic insert)
//   2. Booking unique index on xendit_invoice_id (DB rejects duplicates)
//   3. Subscription unique index on xendit_recurring_plan_id (lookup-then-update)
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

  // ─── Layer 1: event-level idempotency ────────────────────────────────
  // Xendit always sends a unique event id (`id` for invoices, `event_id` or
  // top-level `id` on recurring callbacks). Try to insert it; if it already
  // exists, we've already processed this delivery and can ack with 200.
  const eventId =
    event.event_id ??
    event.webhook_id ??
    event.id ??
    `${event.event ?? event.status ?? "unknown"}_${event.created ?? Date.now()}`;
  const evType = event.event ?? event.type ?? (event.status === "PAID" ? "invoice.paid" : "unknown");

  const { error: dedupErr } = await admin
    .from("processed_webhook_events")
    .insert({ id: `xendit_${eventId}`, provider: "xendit", event_type: evType });

  if (dedupErr) {
    // 23505 = unique_violation → already processed → ack
    if ((dedupErr as any).code === "23505") {
      console.log("xendit-webhook: duplicate event ignored", eventId);
      return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200 });
    }
    console.error("xendit-webhook: dedup insert error", dedupErr);
    // Fall through — we'd rather process twice than drop a real event.
  }

  try {
    // ─── Branch A: Invoice paid (one-time booking) ──────────────────────
    if (event.status === "PAID" && event.metadata?.booking_kind === "session") {
      const m = event.metadata;
      const invoiceId = event.id as string;

      // Layer 2: unique index on xendit_invoice_id. Insert booking first;
      // if duplicate, skip the slot update too (already booked).
      const { data: slot } = await admin
        .from("availability_slots")
        .select("starts_at, duration_min, price_cents, is_booked")
        .eq("id", m.slot_id)
        .maybeSingle();
      if (!slot) {
        console.warn("xendit-webhook: slot not found", m.slot_id);
        return new Response(JSON.stringify({ ok: true, ignored: "no-slot" }), { status: 200 });
      }

      const { error: insErr } = await admin.from("bookings").insert({
        mentee_id: m.mentee_id,
        coach_id: m.coach_id,
        slot_id: m.slot_id,
        starts_at: slot.starts_at,
        duration_min: slot.duration_min,
        price_cents: slot.price_cents,
        status: "confirmed",
        payment_provider: "xendit",
        xendit_invoice_id: invoiceId,
      });

      if (insErr) {
        if ((insErr as any).code === "23505") {
          console.log("xendit-webhook: booking already exists for invoice", invoiceId);
          return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200 });
        }
        throw insErr;
      }

      // Only mark slot booked if this is the first time we created the booking.
      if (!slot.is_booked) {
        await admin.from("availability_slots").update({ is_booked: true }).eq("id", m.slot_id);
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // ─── Branch B: Recurring plan events ────────────────────────────────
    const plan = event.data ?? event;
    const meta = plan.metadata ?? event.metadata ?? {};
    const planId = plan.id ?? plan.plan_id;

    if (evType === "recurring.plan.activated" || evType === "recurring.cycle.succeeded") {
      if (!planId || !meta.mentee_id || !meta.coach_id || !meta.tier_id) {
        console.warn("xendit-webhook: missing plan metadata", evType);
        return new Response(JSON.stringify({ ok: true, ignored: "no-metadata" }), { status: 200 });
      }
      const periodEnd = (plan.next_action_at ?? plan.next_payment_at)
        ? new Date(plan.next_action_at ?? plan.next_payment_at).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Layer 3: lookup by unique xendit_recurring_plan_id. If row exists,
      // update only — never re-insert. Side-effects gate on (existing == null
      // OR existing.status != 'active') AND insert success.
      const { data: existing } = await admin
        .from("subscriptions")
        .select("id, status")
        .eq("xendit_recurring_plan_id", planId)
        .maybeSingle();

      let isFirstActivation = false;

      if (existing) {
        // Renewal or redelivery — just update period.
        await admin.from("subscriptions").update({
          status: "active",
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        // First activation only when transitioning from non-active → active.
        isFirstActivation = existing.status !== "active";
      } else {
        // Try to create. Unique index on xendit_recurring_plan_id catches races.
        const { error: subInsErr } = await admin.from("subscriptions").insert({
          mentee_id: meta.mentee_id,
          coach_id: meta.coach_id,
          tier_id: meta.tier_id,
          status: "active",
          payment_provider: "xendit",
          xendit_recurring_plan_id: planId,
          xendit_customer_id: plan.customer_id,
          current_period_end: periodEnd,
        });
        if (subInsErr) {
          if ((subInsErr as any).code === "23505") {
            // Concurrent webhook delivery beat us; treat as already-processed.
            console.log("xendit-webhook: subscription race, already inserted", planId);
            return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200 });
          }
          throw subInsErr;
        }
        isFirstActivation = true;
      }

      // Side-effects only on FIRST activation. Each guarded individually
      // so retries can't double-increment subscriber_count or duplicate DMs.
      if (isFirstActivation) {
        // Subscriber count — only increment if this mentee has no prior active sub to this coach.
        const { count } = await admin
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("mentee_id", meta.mentee_id)
          .eq("coach_id", meta.coach_id)
          .eq("status", "active");
        if ((count ?? 0) <= 1) {
          // 1 = the row we just inserted/updated.
          const { data: cp } = await admin
            .from("coach_profiles")
            .select("subscriber_count")
            .eq("user_id", meta.coach_id)
            .maybeSingle();
          if (cp) {
            await admin
              .from("coach_profiles")
              .update({ subscriber_count: (cp.subscriber_count ?? 0) + 1 })
              .eq("user_id", meta.coach_id);
          }
        }

        // DM conversation — guarded by existence check.
        const { data: convo } = await admin
          .from("conversations")
          .select("id")
          .eq("mentee_id", meta.mentee_id)
          .eq("coach_id", meta.coach_id)
          .maybeSingle();
        if (!convo) {
          await admin.from("conversations").insert({
            mentee_id: meta.mentee_id,
            coach_id: meta.coach_id,
          }).then(({ error }) => {
            // Ignore unique violations from concurrent inserts.
            if (error && (error as any).code !== "23505") console.error("convo insert", error);
          });
        }
        // TODO: welcome email — Resend connector when configured.
      }

      return new Response(JSON.stringify({ ok: true, first: isFirstActivation }), { status: 200 });
    }

    if (evType === "recurring.plan.inactivated" || evType === "recurring.cycle.failed") {
      if (planId) {
        await admin
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("xendit_recurring_plan_id", planId);
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    console.log("xendit-webhook: unhandled", evType);
    return new Response(JSON.stringify({ ok: true, ignored: evType }), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    console.error("xendit-webhook error:", msg);
    // Roll back the dedup row so Xendit's retry can reprocess.
    await admin.from("processed_webhook_events").delete().eq("id", `xendit_${eventId}`);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
