// Recurring IDR subscription for a coach tier via Xendit Recurring Plans.
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { xenditFetch, usdCentsToIdr } from "../_shared/xendit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);

    const { tier_id } = await req.json();
    if (!tier_id) return json({ error: "tier_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: tier } = await admin
      .from("subscription_tiers")
      .select("id, name, price_cents, price_idr_cents, coach_id")
      .eq("id", tier_id)
      .maybeSingle();
    if (!tier) return json({ error: "Tier not found" }, 404);

    const idrAmount = tier.price_idr_cents ?? usdCentsToIdr(tier.price_cents);
    const origin = req.headers.get("origin") ?? "https://example.com";

    // Get or create Xendit customer
    const { data: profile } = await admin.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
    const customer = await xenditFetch("/customers", {
      method: "POST",
      body: JSON.stringify({
        reference_id: `mentee_${u.user.id}`,
        type: "INDIVIDUAL",
        email: u.user.email,
        individual_detail: { given_names: profile?.display_name ?? "Mentee" },
      }),
    }).catch(async (e: Error) => {
      // If already exists, look it up
      if (String(e.message).includes("DUPLICATE")) {
        const list = await xenditFetch(`/customers?reference_id=mentee_${u.user.id}`);
        return list.data?.[0];
      }
      throw e;
    });

    const externalId = `sub_${tier.id}_${u.user.id}_${Date.now()}`;
    const plan = await xenditFetch("/recurring/plans", {
      method: "POST",
      body: JSON.stringify({
        reference_id: externalId,
        customer_id: customer.id,
        recurring_action: "PAYMENT",
        currency: "IDR",
        amount: idrAmount,
        schedule: { reference_id: externalId, interval: "MONTH", interval_count: 1 },
        immediate_action_type: "FULL_AMOUNT",
        notification_config: { recurring_created: ["EMAIL"], recurring_succeeded: ["EMAIL"], recurring_failed: ["EMAIL"] },
        failed_cycle_action: "STOP",
        metadata: {
          mentee_id: u.user.id,
          coach_id: tier.coach_id,
          tier_id: tier.id,
          provider: "xendit",
        },
        success_return_url: `${origin}/feed?subscribed=1`,
        failure_return_url: `${origin}/coach`,
      }),
    });

    return json({ url: plan.actions?.[0]?.url ?? plan.action_url ?? `${origin}/feed?subscribed=1`, id: plan.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("create-xendit-subscription:", msg);
    return json({ error: msg }, 500);
  }
});
