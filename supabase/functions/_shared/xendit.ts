// Shared Xendit helpers. Direct API calls (no gateway) using Basic auth.
export const XENDIT_BASE = "https://api.xendit.co";

export function xenditAuthHeader(): string {
  const key = Deno.env.get("XENDIT_SECRET_KEY");
  if (!key) throw new Error("XENDIT_SECRET_KEY not configured");
  return "Basic " + btoa(key + ":");
}

export async function xenditFetch(path: string, init: RequestInit = {}) {
  const r = await fetch(`${XENDIT_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: xenditAuthHeader(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await r.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* */ }
  if (!r.ok) {
    throw new Error(`Xendit ${path} ${r.status}: ${text}`);
  }
  return json;
}

/** Convert USD cents → IDR cents (whole rupiah, no decimals in IDR).
 *  Default rate ~16,000 IDR per USD. Override via XENDIT_USD_TO_IDR env. */
export function usdCentsToIdr(usdCents: number): number {
  const rate = Number(Deno.env.get("XENDIT_USD_TO_IDR") ?? "16000");
  const usd = usdCents / 100;
  return Math.round(usd * rate);
}
