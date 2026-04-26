// Built-in payments webhook handler.
// Lovable's payments gateway forwards normalized events here.
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

  try {
    const type: string = event.type ?? "";
    const obj = event.data?.object ?? {};

    if (type === "checkout.session.completed" || type === "transaction.completed") {
      const md = obj.metadata ?? {};

      // Subscription checkout
      if (md.tier_id && md.mentee_id && md.coach_id) {
        // Detect if this is an upgrade/downgrade (existing sub for same coach)
        const { data: prevSub } = await admin
          .from("subscriptions")
          .select("id, tier_id, status")
          .eq("mentee_id", md.mentee_id)
          .eq("coach_id", md.coach_id)
          .maybeSingle();

        const wasActive = prevSub && ["active", "trialing"].includes(prevSub.status);
        const isTierChange = wasActive && prevSub.tier_id !== md.tier_id;

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

        // Only run "new subscriber" side-effects on a genuinely new subscription
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
      // Handle plan change via portal: price -> tier_id mapping
      const newPriceId = obj.items?.data?.[0]?.price?.id;
      let updatePayload: any = {
        status: obj.status,
        current_period_end: obj.current_period_end
          ? new Date(obj.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: obj.cancel_at_period_end ?? false,
      };
      if (newPriceId) {
        const { data: matchTier } = await admin
          .from("subscription_tiers").select("id").eq("stripe_price_id", newPriceId).maybeSingle();
        if (matchTier) updatePayload.tier_id = matchTier.id;
      }
      await admin.from("subscriptions")
        .update(updatePayload)
        .eq("stripe_subscription_id", obj.id);
    }

    if (type === "subscription.canceled" || type === "customer.subscription.deleted") {
      // End-of-period access: keep status until current_period_end naturally passes.
      // Stripe sends this when fully canceled (period ended).
      const { data: sub } = await admin
        .from("subscriptions")
        .select("mentee_id, coach_id, status")
        .eq("stripe_subscription_id", obj.id)
        .maybeSingle();
      await admin.from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", obj.id);
      if (sub && ["active", "trialing"].includes(sub.status)) {
        await bumpSubscriberCount(admin, sub.coach_id, -1);
      }
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
