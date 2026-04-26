// Stripe checkout via the Lovable connector gateway.
// Creates a subscription checkout session for a given subscription_tier.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/stripe";

interface RequestBody {
  tier_id: string;
  success_url?: string;
  cancel_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const STRIPE_API_KEY = Deno.env.get("STRIPE_SANDBOX_API_KEY") ?? Deno.env.get("STRIPE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

  if (!LOVABLE_API_KEY || !STRIPE_API_KEY) {
    return new Response(JSON.stringify({ error: "Payments not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const user = userData.user;

    const body = (await req.json()) as RequestBody;
    if (!body?.tier_id) {
      return new Response(JSON.stringify({ error: "tier_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load tier (use service role via the user-context client; tiers are publicly readable)
    const { data: tier, error: tErr } = await supabase
      .from("subscription_tiers")
      .select("id, name, price_cents, coach_id, stripe_price_id")
      .eq("id", body.tier_id)
      .maybeSingle();
    if (tErr || !tier) {
      return new Response(JSON.stringify({ error: "Tier not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure a Stripe Price exists. If not, create product + price on demand.
    let priceId = tier.stripe_price_id;
    if (!priceId) {
      const productResp = await fetch(`${GATEWAY_URL}/v1/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": STRIPE_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ name: `Coach tier: ${tier.name}` }).toString(),
      });
      const product = await productResp.json();
      if (!productResp.ok) throw new Error(`Stripe product ${productResp.status}: ${JSON.stringify(product)}`);

      const priceResp = await fetch(`${GATEWAY_URL}/v1/prices`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": STRIPE_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "product": product.id,
          "unit_amount": String(tier.price_cents),
          "currency": "usd",
          "recurring[interval]": "month",
        }).toString(),
      });
      const price = await priceResp.json();
      if (!priceResp.ok) throw new Error(`Stripe price ${priceResp.status}: ${JSON.stringify(price)}`);
      priceId = price.id;

      await supabase.from("subscription_tiers").update({ stripe_price_id: priceId }).eq("id", tier.id);
    }

    const origin = req.headers.get("origin") ?? "https://example.com";
    const params = new URLSearchParams({
      "mode": "subscription",
      "success_url": body.success_url ?? `${origin}/feed?subscribed=1`,
      "cancel_url": body.cancel_url ?? `${origin}/coach`,
      "line_items[0][price]": priceId!,
      "line_items[0][quantity]": "1",
      "customer_email": user.email ?? "",
      "client_reference_id": user.id,
      "metadata[mentee_id]": user.id,
      "metadata[coach_id]": tier.coach_id,
      "metadata[tier_id]": tier.id,
    });

    const sessionResp = await fetch(`${GATEWAY_URL}/v1/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": STRIPE_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const session = await sessionResp.json();
    if (!sessionResp.ok) throw new Error(`Stripe session ${sessionResp.status}: ${JSON.stringify(session)}`);

    return new Response(JSON.stringify({ url: session.url, id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("create-subscription-checkout:", msg);
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
