// One-time IDR invoice for booking a 1:1 slot via Xendit.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { xenditFetch, usdCentsToIdr } from "../_shared/xendit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);

    const { slot_id } = await req.json();
    if (!slot_id) return json({ error: "slot_id required" }, 400);

    const { data: slot } = await supabase
      .from("availability_slots")
      .select("id, coach_id, starts_at, duration_min, price_cents, is_booked")
      .eq("id", slot_id)
      .maybeSingle();
    if (!slot) return json({ error: "Slot not found" }, 404);
    if (slot.is_booked) return json({ error: "Slot already booked" }, 409);

    const idrAmount = usdCentsToIdr(slot.price_cents);
    const origin = req.headers.get("origin") ?? "https://example.com";
    const externalId = `booking_${slot.id}_${u.user.id}_${Date.now()}`;

    const invoice = await xenditFetch("/v2/invoices", {
      method: "POST",
      body: JSON.stringify({
        external_id: externalId,
        amount: idrAmount,
        currency: "IDR",
        payer_email: u.user.email,
        description: `1:1 coaching session (${slot.duration_min} min)`,
        success_redirect_url: `${origin}/sessions?booked=1`,
        failure_redirect_url: `${origin}/discover`,
        metadata: {
          mentee_id: u.user.id,
          coach_id: slot.coach_id,
          slot_id: slot.id,
          booking_kind: "session",
          provider: "xendit",
        },
      }),
    });

    return json({ url: invoice.invoice_url, id: invoice.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("create-xendit-invoice:", msg);
    return json({ error: msg }, 500);
  }
});
