// Stripe webhook handler — checkout.session.completed, customer.subscription.*
// HARDENED:
//   - Event-level dedup via processed_webhook_events (idempotent across retries)
//   - Bookings dedup via UNIQUE(stripe_payment_intent_id) — DB rejects dupes
//   - subscriber_count only changes on real status transitions
//   - cancel_at_period_end is reflected immediately so the UI shows the end date
//   - tier_id resolved from price.id OR fallback subscription.metadata.tier_id
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

async function sendEmail(admin: any, to: string, subject: string, html: string) {
  try {
    await admin.functions.invoke("send-transactional-email", {
      body: { to, subject, html, purpose: "transactional" },
    });
  } catch (e) {
    console.warn("email send skipped:", (e as Error).message);
  }
}

async function ensureConversation(admin: any, mentee_id: string, coach_id: string) {
  const { data: existing } = await admin
    .from("conversations")
    .select("id")
    .eq("mentee_id", mentee_id)
    .eq("coach_id", coach_id)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created } = await admin
    .from("conversations")
    .insert({ mentee_id, coach_id })
    .select("id")
    .single();
  return created?.id;
}

async function bumpSubscriberCount(admin: any, coach_id: string, delta: number) {
  const { data: cp } = await admin
    .from("coach_profiles")
    .select("subscriber_count")
    .eq("user_id", coach_id)
    .maybeSingle();
  const next = Math.max(0, (cp?.subscriber_count ?? 0) + delta);
  await admin.from("coach_profiles").update({ subscriber_count: next }).eq("user_id", coach_id);
}

async function notifySubscribed(admin: any, mentee_id: string, coach_id: string, tierName: string) {
  const { data: mentee } = await admin.auth.admin.getUserById(mentee_id);
  const { data: coach } = await admin.auth.admin.getUserById(coach_id);
  const { data: coachProfile } = await admin.from("profiles").select("display_name, handle").eq("id", coach_id).maybeSingle();
  const { data: menteeProfile } = await admin.from("profiles").select("display_name").eq("id", mentee_id).maybeSingle();
  const coachName = coachProfile?.display_name ?? "your coach";
  const menteeName = menteeProfile?.display_name ?? "A new mentee";

  if (mentee?.user?.email) {
    await sendEmail(
      admin,
      mentee.user.email,
      `Welcome to ${coachName}'s ${tierName} tier`,
      `<h2>Welcome aboard!</h2><p>You're now subscribed to <strong>${coachName}</strong> on the <strong>${tierName}</strong> tier. Head to the feed to see exclusive content and message your coach directly.</p>`,
    );
  }
  if (coach?.user?.email) {
    await sendEmail(
      admin,
      coach.user.email,
      `🎉 New subscriber on ${tierName}`,
      `<h2>New subscriber!</h2><p><strong>${menteeName}</strong> just subscribed to your <strong>${tierName}</strong> tier.</p>`,
    );
  }
}

/** Resolve tier_id for a Stripe subscription update event.
 *  Prefer subscription.metadata.tier_id (we set this in change-subscription).
 *  Fallback: look up by stripe_price_id mapped on subscription_tiers.        */
async function resolveTierId(admin: any, obj: any): Promise<string | null> {
  const metaTier = obj.metadata?.tier_id;
  if (metaTier) return metaTier;
  const priceId = obj.items?.data?.[0]?.price?.id;
  if (!priceId) return null;
  const { data: t } = await admin
    .from("subscription_tiers")
    .select("id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  return t?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const env = url.searchParams.get("env") ?? "sandbox";
  const expectedSecret =
    env === "live"
      ? Deno.env.get("PAYMENTS_LIVE_WEBHOOK_SECRET")
      : Deno.env.get("PAYMENTS_SANDBOX_WEBHOOK_SECRET");

  const provided = req.headers.get("x-payments-secret") ?? req.headers.get("stripe-signature");
  if (expectedSecret && provided && !provided.includes(expectedSecret)) {
    console.warn("payments-webhook: secret mismatch");
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let event: any;
  try {
    event = await req.json();
  } catch {
    return new Response("bad json", { status: 400, headers: corsHeaders });
  }

  // ─── Event-level idempotency (Stripe retries up to 3 days) ────────────
  const eventId = event.id ?? `${event.type ?? "unknown"}_${event.created ?? Date.now()}`;
  const evType: string = event.type ?? "";
  const { error: dedupErr } = await admin
    .from("processed_webhook_events")
    .insert({ id: `stripe_${eventId}`, provider: "stripe", event_type: evType });
  if (dedupErr) {
    if ((dedupErr as any).code === "23505") {
      console.log("payments-webhook: duplicate event ignored", eventId);
      return new Response(JSON.stringify({ ok: true, duplicate: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.error("payments-webhook: dedup insert error", dedupErr);
    // fall through — better to process twice than drop a real event.
  }

  try {
    const obj = event.data?.object ?? {};

    if (evType === "checkout.session.completed" || evType === "transaction.completed") {
      const md = obj.metadata ?? {};

      // ── Subscription checkout ─────────────────────────────────────────
      if (md.tier_id && md.mentee_id && md.coach_id) {
        const { data: prevSub } = await admin
          .from("subscriptions")
          .select("id, tier_id, status")
          .eq("mentee_id", md.mentee_id)
          .eq("coach_id", md.coach_id)
          .neq("status", "canceled")
          .maybeSingle();

        const wasActive = prevSub && ["active", "trialing"].includes(prevSub.status);
        const isTierChange = wasActive && prevSub.tier_id !== md.tier_id;

        await admin.from("subscriptions").upsert({
          mentee_id: md.mentee_id,
          coach_id: md.coach_id,
          tier_id: md.tier_id,
          status: "active",
          payment_provider: "stripe",
          stripe_subscription_id: obj.subscription ?? obj.id,
          current_period_end: obj.current_period_end
            ? new Date(obj.current_period_end * 1000).toISOString()
            : null,
        }, { onConflict: "mentee_id,coach_id" });

        if (!wasActive) {
          await bumpSubscriberCount(admin, md.coach_id, +1);
          await ensureConversation(admin, md.mentee_id, md.coach_id);
          const { data: tier } = await admin
            .from("subscription_tiers").select("name").eq("id", md.tier_id).maybeSingle();
          await notifySubscribed(admin, md.mentee_id, md.coach_id, tier?.name ?? "Subscriber");
        } else if (isTierChange) {
          const { data: tier } = await admin
            .from("subscription_tiers").select("name").eq("id", md.tier_id).maybeSingle();
          const { data: mentee } = await admin.auth.admin.getUserById(md.mentee_id);
          if (mentee?.user?.email) {
            await sendEmail(
              admin,
              mentee.user.email,
              `Your plan has changed to ${tier?.name ?? "new tier"}`,
              `<p>Your subscription has been updated to <strong>${tier?.name}</strong>. Any difference in price has been prorated automatically.</p>`,
            );
          }
        }
      }

      // ── Booking checkout (idempotent via UNIQUE on stripe_payment_intent_id) ──
      if (md.booking_kind === "session" && md.slot_id) {
        const pi = obj.payment_intent ?? obj.id;
        const { data: slot } = await admin.from("availability_slots")
          .select("starts_at, duration_min, price_cents, coach_id, is_booked")
          .eq("id", md.slot_id).maybeSingle();
        if (slot) {
          const { error: insErr } = await admin.from("bookings").insert({
            slot_id: md.slot_id,
            mentee_id: md.mentee_id,
            coach_id: slot.coach_id,
            starts_at: slot.starts_at,
            duration_min: slot.duration_min,
            price_cents: slot.price_cents,
            status: "confirmed",
            payment_provider: "stripe",
            stripe_payment_intent_id: pi,
            meeting_url: `https://meet.jit.si/onlycoach-${md.slot_id}`,
          });
          if (insErr && (insErr as any).code !== "23505") throw insErr;
          if (!slot.is_booked) {
            await admin.from("availability_slots").update({ is_booked: true }).eq("id", md.slot_id);
          }
        }
      }
    }

    if (evType === "customer.subscription.updated" || evType === "subscription.updated") {
      const tierId = await resolveTierId(admin, obj);
      const updatePayload: Record<string, unknown> = {
        status: obj.status,
        current_period_end: obj.current_period_end
          ? new Date(obj.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: obj.cancel_at_period_end ?? false,
        updated_at: new Date().toISOString(),
      };
      if (tierId) updatePayload.tier_id = tierId;
      await admin.from("subscriptions")
        .update(updatePayload)
        .eq("stripe_subscription_id", obj.id);
    }

    if (evType === "customer.subscription.deleted" || evType === "subscription.canceled") {
      // Period actually ended → revoke. Only decrement if we're transitioning
      // from a still-counted state (avoids double-decrement on retries).
      const { data: sub } = await admin
        .from("subscriptions")
        .select("mentee_id, coach_id, status")
        .eq("stripe_subscription_id", obj.id)
        .maybeSingle();
      await admin.from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", obj.id);
      if (sub && sub.status !== "canceled") {
        await bumpSubscriberCount(admin, sub.coach_id, -1);
      }
    }

    return new Response(JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("payments-webhook error:", msg, evType);
    // Roll back the dedup row so Stripe's retry can reprocess.
    await admin.from("processed_webhook_events").delete().eq("id", `stripe_${eventId}`);
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
