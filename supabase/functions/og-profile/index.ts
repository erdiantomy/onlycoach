// OG meta tag generator for coach and mentee public profiles.
// Crawlers (WhatsApp, Twitter, Telegram) hit this endpoint to get rich previews.
// Usage: GET /og-profile?handle=maya&role=coach
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const SITE = "https://onlycoach.co";
const DEFAULT_OG = `${SITE}/og-image.png`;
const SUPABASE_STORAGE = Deno.env.get("SUPABASE_URL") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const handle = url.searchParams.get("handle");
  const role = url.searchParams.get("role") ?? "coach";

  if (!handle) {
    return new Response("Missing handle", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let title = "OnlyCoach — Your coach, in your pocket";
  let description = "Subscribe to coaches, unlock content, message directly, book 1:1 sessions.";
  let image = DEFAULT_OG;
  let pageUrl = `${SITE}/${role}/${handle}`;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name, handle, bio, headline, avatar_url")
      .eq("handle", handle)
      .maybeSingle();

    if (profile) {
      if (role === "coach") {
        const { data: cp } = await supabase
          .from("coach_profiles")
          .select("niche, subscriber_count")
          .eq("user_id", profile.id)
          .maybeSingle();

        title = `${profile.display_name} — ${profile.headline ?? (cp?.niche ?? "Coach")} on OnlyCoach`;
        description = [
          profile.bio?.slice(0, 120),
          cp?.subscriber_count ? `${cp.subscriber_count.toLocaleString()} subscribers.` : null,
        ].filter(Boolean).join(" ") || description;
      } else {
        title = `${profile.display_name} (@${profile.handle}) on OnlyCoach`;
        description = profile.bio?.slice(0, 160) || description;
      }

      if (profile.avatar_url) {
        image = profile.avatar_url;
      } else if (profile.id) {
        // Try storage avatar
        const storagePath = `${SUPABASE_STORAGE}/storage/v1/object/public/avatars/${profile.id}/avatar.jpg`;
        image = storagePath;
      }
    }
  } catch {
    // Fall through to defaults
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />

  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="OnlyCoach" />
  <meta property="og:title" content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:image" content="${escHtml(image)}" />
  <meta property="og:url" content="${escHtml(pageUrl)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  <meta name="twitter:image" content="${escHtml(image)}" />

  <meta http-equiv="refresh" content="0; url=${escHtml(pageUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escHtml(pageUrl)}">${escHtml(title)}</a>…</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
