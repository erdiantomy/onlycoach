// Upgrade/downgrade an existing subscription with immediate proration.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/stripe";

interface RequestBody { new_tier_id: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const STRIPE_API_KEY = Deno.env.get("STRIPE_SANDBOX_API_KEY") ?? Deno.env.get("STRIPE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!LOVABLE_API_KEY || !STRIPE_API_KEY) {
    return new Response(JSON.stringify({ error: "Payments not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const user = userData.user;
    const body = (await req.json()) as RequestBody;
    if (!body?.new_tier_id) {
      return new Response(JSON.stringify({ error: "new_tier_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load target tier
    const { data: tier } = await admin
      .from("subscription_tiers")
      .select("id, name, price_cents, coach_id, stripe_price_id")
      .eq("id", body.new_tier_id)
      .maybeSingle();
    if (!tier) {
      return new Response(JSON.stringify({ error: "Tier not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Existing subscription for this coach
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, stripe_subscription_id, tier_id, status")
      .eq("mentee_id", user.id)
      .eq("coach_id", tier.coach_id)
      .maybeSingle();
    if (!sub || !sub.stripe_subscription_id || !["active", "trialing"].includes(sub.status)) {
      return new Response(JSON.stringify({ error: "No active subscription to change" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (sub.tier_id === tier.id) {
      return new Response(JSON.stringify({ ok: true, unchanged: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure target price exists in Stripe
    let priceId = tier.stripe_price_id;
    if (!priceId) {
      const productResp = await fetch(`${GATEWAY_URL}/v1/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": STRIPE_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ name: `Coach tier: ${tier.name}` }).toString(),
      });
      const product = await productResp.json();
      const priceResp = await fetch(`${GATEWAY_URL}/v1/prices`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": STRIPE_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          product: product.id, unit_amount: String(tier.price_cents),
          currency: "usd", "recurring[interval]": "month",
        }).toString(),
      });
      const price = await priceResp.json();
      if (!priceResp.ok) throw new Error(`Stripe price ${priceResp.status}: ${JSON.stringify(price)}`);
      priceId = price.id;
      await admin.from("subscription_tiers").update({ stripe_price_id: priceId }).eq("id", tier.id);
    }

    // Fetch current subscription items to get the item id to swap
    const subResp = await fetch(`${GATEWAY_URL}/v1/subscriptions/${sub.stripe_subscription_id}`, {
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": STRIPE_API_KEY },
    });
    const stripeSub = await subResp.json();
    if (!subResp.ok) throw new Error(`Stripe sub fetch ${subResp.status}: ${JSON.stringify(stripeSub)}`);
    const itemId = stripeSub.items?.data?.[0]?.id;
    if (!itemId) throw new Error("Subscription item not found");

    // Swap price with proration. Stamp metadata.tier_id so the
    // subsequent customer.subscription.updated webhook can resolve our
    // local tier without depending on stripe_price_id reverse-lookup.
    const updateParams = new URLSearchParams({
      "items[0][id]": itemId,
      "items[0][price]": priceId!,
      "proration_behavior": "always_invoice",
      "cancel_at_period_end": "false",
      "metadata[tier_id]": tier.id,
      "metadata[mentee_id]": user.id,
      "metadata[coach_id]": tier.coach_id,
    });
    const updResp = await fetch(`${GATEWAY_URL}/v1/subscriptions/${sub.stripe_subscription_id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": STRIPE_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded" },
      body: updateParams.toString(),
    });
    const updated = await updResp.json();
    if (!updResp.ok) throw new Error(`Stripe update ${updResp.status}: ${JSON.stringify(updated)}`);

    // Reflect locally immediately — webhook will reconfirm shortly.
    await admin.from("subscriptions")
      .update({
        tier_id: tier.id,
        status: updated.status ?? "active",
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);


    return new Response(JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("change-subscription:", msg);
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
