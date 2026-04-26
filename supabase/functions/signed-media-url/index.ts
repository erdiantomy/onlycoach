// Issues a short-lived signed URL for post-media, but only if the caller has
// an active subscription to the post's required tier (or is the coach).
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let storage_path: string;
  try {
    ({ storage_path } = await req.json());
    if (!storage_path) throw new Error();
  } catch {
    return new Response(JSON.stringify({ error: "storage_path required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // RLS enforces visibility on post_media. If the user can't read the row,
  // they can't get a URL.
  const { data: media, error: mErr } = await userClient.from("post_media")
    .select("id, post_id").eq("storage_path", storage_path).maybeSingle();
  if (mErr || !media) {
    return new Response(JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: signed, error } = await admin.storage.from("post-media").createSignedUrl(storage_path, 60 * 30);
  if (error || !signed) {
    return new Response(JSON.stringify({ error: error?.message ?? "Signing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ url: signed.signedUrl }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
