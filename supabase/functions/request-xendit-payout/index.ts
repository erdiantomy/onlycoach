// Coach requests a payout. Creates a Xendit Disbursement and a payouts row.
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
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Balance
    const { data: bal } = await admin.from("coach_balances").select("available_idr_cents").eq("coach_id", u.user.id).maybeSingle();
    const available = Number(bal?.available_idr_cents ?? 0);
    const MIN = 25_000_000; // Rp 250.000 stored as IDR×100
    if (available < MIN) return json({ error: `Minimum payout is Rp 250.000. Available: Rp ${Math.round(available/100).toLocaleString("id-ID")}` }, 400);

    const { data: acct } = await admin.from("coach_payout_accounts").select("*").eq("coach_id", u.user.id).maybeSingle();
    if (!acct?.account_number || !acct?.bank_name || !acct?.account_name) {
      return json({ error: "Add bank details before requesting a payout." }, 400);
    }

    const amountRupiah = Math.floor(available / 100);
    const externalId = `payout_${u.user.id}_${Date.now()}`;

    const disb = await xenditFetch("/v2/disbursements", {
      method: "POST",
      headers: { "X-IDEMPOTENCY-KEY": externalId },
      body: JSON.stringify({
        external_id: externalId,
        amount: amountRupiah,
        bank_code: acct.bank_name, // expects Xendit bank code (e.g. "BCA")
        account_holder_name: acct.account_name,
        account_number: acct.account_number,
        description: "OnlyCoach payout",
      }),
    });

    const { error: insErr } = await admin.from("payouts").insert({
      coach_id: u.user.id,
      amount_cents: available,
      currency: "idr",
      status: "processing",
      xendit_disbursement_id: disb.id,
    });
    if (insErr) throw insErr;

    return json({ ok: true, id: disb.id, amount: amountRupiah });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    console.error("request-xendit-payout:", msg);
    return json({ error: msg }, 500);
  }
});
