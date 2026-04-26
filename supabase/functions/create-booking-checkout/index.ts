// One-time payment checkout for a 1:1 booking slot.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/stripe";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const STRIPE_API_KEY = Deno.env.get("STRIPE_SANDBOX_API_KEY") ?? Deno.env.get("STRIPE_API_KEY");
  if (!LOVABLE_API_KEY || !STRIPE_API_KEY) {
    return new Response(JSON.stringify({ error: "Payments not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { slot_id } = await req.json();
    if (!slot_id) {
      return new Response(JSON.stringify({ error: "slot_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: slot, error: sErr } = await supabase
      .from("availability_slots")
      .select("id, coach_id, starts_at, duration_min, price_cents, is_booked")
      .eq("id", slot_id)
      .maybeSingle();
    if (sErr || !slot) {
      return new Response(JSON.stringify({ error: "Slot not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (slot.is_booked) {
      return new Response(JSON.stringify({ error: "Slot already booked" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const origin = req.headers.get("origin") ?? "https://example.com";
    const params = new URLSearchParams({
      "mode": "payment",
      "success_url": `${origin}/sessions?booked=1`,
      "cancel_url": `${origin}/discover`,
      "customer_email": u.user.email ?? "",
      "client_reference_id": u.user.id,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(slot.price_cents),
      "line_items[0][price_data][product_data][name]": `1:1 session (${slot.duration_min} min)`,
      "line_items[0][quantity]": "1",
      "metadata[mentee_id]": u.user.id,
      "metadata[coach_id]": slot.coach_id,
      "metadata[slot_id]": slot.id,
      "metadata[booking_kind]": "session",
    });

    const r = await fetch(`${GATEWAY_URL}/v1/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": STRIPE_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const session = await r.json();
    if (!r.ok) throw new Error(`Stripe ${r.status}: ${JSON.stringify(session)}`);

    return new Response(JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("create-booking-checkout:", msg);
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
