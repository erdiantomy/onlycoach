// Cancel a subscription at period end (mentee retains access until current_period_end).
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/stripe";

interface RequestBody { coach_id: string }

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
    const body = (await req.json()) as RequestBody;
    if (!body?.coach_id) {
      return new Response(JSON.stringify({ error: "coach_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, stripe_subscription_id, status")
      .eq("mentee_id", userData.user.id)
      .eq("coach_id", body.coach_id)
      .maybeSingle();
    if (!sub?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resp = await fetch(`${GATEWAY_URL}/v1/subscriptions/${sub.stripe_subscription_id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": STRIPE_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "cancel_at_period_end": "true" }).toString(),
    });
    const result = await resp.json();
    if (!resp.ok) throw new Error(`Stripe cancel ${resp.status}: ${JSON.stringify(result)}`);

    return new Response(JSON.stringify({
      ok: true,
      cancel_at_period_end: true,
      access_until: result.current_period_end ? new Date(result.current_period_end * 1000).toISOString() : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("cancel-subscription:", msg);
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
