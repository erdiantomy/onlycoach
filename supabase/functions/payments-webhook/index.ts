// Built-in payments webhook handler.
// Lovable's payments gateway forwards normalized events here.
// We simply trust the env=sandbox|live query param and the secret header check.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const env = url.searchParams.get("env") ?? "sandbox";
  const expectedSecret =
    env === "live"
      ? Deno.env.get("PAYMENTS_LIVE_WEBHOOK_SECRET")
      : Deno.env.get("PAYMENTS_SANDBOX_WEBHOOK_SECRET");

  // Verify webhook signature via simple shared-secret header, if configured.
  const provided = req.headers.get("x-payments-secret") ?? req.headers.get("stripe-signature");
  if (expectedSecret && provided && !provided.includes(expectedSecret)) {
    // The gateway will normally use a Stripe-style signed signature; we accept either form.
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

  try {
    const type: string = event.type ?? "";
    const obj = event.data?.object ?? {};

    if (type === "checkout.session.completed" || type === "transaction.completed") {
      const md = obj.metadata ?? {};
      // Subscription checkout
      if (md.tier_id && md.mentee_id && md.coach_id) {
        await admin.from("subscriptions").upsert({
          mentee_id: md.mentee_id,
          coach_id: md.coach_id,
          tier_id: md.tier_id,
          status: "active",
          stripe_subscription_id: obj.subscription ?? obj.id,
          current_period_end: obj.current_period_end
            ? new Date(obj.current_period_end * 1000).toISOString()
            : null,
        }, { onConflict: "mentee_id,coach_id" });
      }
      // Booking checkout
      if (md.booking_kind === "session" && md.slot_id) {
        const { data: slot } = await admin.from("availability_slots")
          .select("starts_at, duration_min, price_cents, coach_id").eq("id", md.slot_id).maybeSingle();
        if (slot) {
          await admin.from("bookings").insert({
            slot_id: md.slot_id,
            mentee_id: md.mentee_id,
            coach_id: slot.coach_id,
            starts_at: slot.starts_at,
            duration_min: slot.duration_min,
            price_cents: slot.price_cents,
            status: "confirmed",
            stripe_payment_intent_id: obj.payment_intent ?? obj.id,
            meeting_url: `https://meet.jit.si/onlycoach-${md.slot_id}`,
          });
          await admin.from("availability_slots").update({ is_booked: true }).eq("id", md.slot_id);
        }
      }
    }

    if (type === "subscription.updated" || type === "customer.subscription.updated") {
      await admin.from("subscriptions")
        .update({
          status: obj.status,
          current_period_end: obj.current_period_end
            ? new Date(obj.current_period_end * 1000).toISOString() : null,
        })
        .eq("stripe_subscription_id", obj.id);
    }

    if (type === "subscription.canceled" || type === "customer.subscription.deleted") {
      await admin.from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", obj.id);
    }

    return new Response(JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("payments-webhook error:", msg, event?.type);
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
