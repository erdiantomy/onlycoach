// Cancel a Xendit Recurring Plan at end of current cycle.
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { xenditFetch } from "../_shared/xendit.ts";

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

    const { coach_id } = await req.json();
    if (!coach_id) return json({ error: "coach_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, xendit_recurring_plan_id, current_period_end")
      .eq("mentee_id", u.user.id)
      .eq("coach_id", coach_id)
      .eq("payment_provider", "xendit")
      .maybeSingle();
    if (!sub?.xendit_recurring_plan_id) return json({ error: "No Xendit subscription" }, 404);

    // Deactivate plan — Xendit completes the current cycle then stops billing.
    await xenditFetch(`/recurring/plans/${sub.xendit_recurring_plan_id}/deactivate`, { method: "POST" });

    await admin
      .from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("id", sub.id);

    return json({ ok: true, access_until: sub.current_period_end });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("cancel-xendit-subscription:", msg);
    return json({ error: msg }, 500);
  }
});
