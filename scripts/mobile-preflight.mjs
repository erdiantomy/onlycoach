#!/usr/bin/env node
/**
 * Mobile release preflight.
 *
 * Run before `npx cap sync && npx cap build` for an App Store / Play Store
 * release. Fails loudly if any production config is wrong.
 *
 *   node scripts/mobile-preflight.mjs
 *
 * Checks performed:
 *   1. capacitor.config.ts has NO `server.url` block (would point shipped
 *      app at the Lovable preview).
 *   2. capacitor.config.ts has `webDir: "dist"` and a real appId.
 *   3. `dist/` exists and contains index.html (i.e. `npm run build` ran).
 *   4. Required Vite env vars are present in dist/assets bundles.
 *   5. PWA manifest + icons are present in dist.
 *   6. iOS-only: Info.plist contains URL scheme + NSAppTransportSecurity is sane.
 *   7. Android-only: AndroidManifest.xml has internet permission and intent
 *      filters for deep links.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const errors = [];
const warnings = [];
const ok = [];

function check(label, cond, errMsg, warn = false) {
  if (cond) ok.push(label);
  else (warn ? warnings : errors).push(`${label}: ${errMsg}`);
}

// 1–2. Capacitor config
const capPath = join(ROOT, "capacitor.config.ts");
if (!existsSync(capPath)) {
  errors.push("capacitor.config.ts not found");
} else {
  const cap = readFileSync(capPath, "utf8");
  // Strip block + line comments before scanning so commented-out config
  // doesn't trigger false positives.
  const stripped = cap
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");
  const hasServerUrl = /server\s*:\s*\{[^}]*url\s*:\s*["'`]https?:/.test(stripped);
  check(
    "capacitor.config.ts: no server.url",
    !hasServerUrl,
    "Remove the `server: { url: ... }` block before release — shipped app will load that URL instead of bundled dist/.",
  );
  check("capacitor.config.ts: webDir=dist", /webDir\s*:\s*["'`]dist["'`]/.test(cap), "Set webDir to 'dist'.");
  check(
    "capacitor.config.ts: appId set",
    /appId\s*:\s*["'`][a-z0-9.]+["'`]/i.test(cap) && !/appId\s*:\s*["'`]com\.example/i.test(cap),
    "Set a real reverse-DNS appId (e.g. com.yourcompany.onlycoach).",
  );
}

// 3. dist/ build output
const distDir = join(ROOT, "dist");
const distIndex = join(distDir, "index.html");
check("dist/index.html exists", existsSync(distIndex), "Run `npm run build` first.");

// 4. Env vars baked into the bundle
const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PROJECT_ID"];
const OPTIONAL_ENV = ["VITE_PAYMENTS_CLIENT_TOKEN"];
if (existsSync(distDir)) {
  const assetsDir = join(distDir, "assets");
  let bundleText = "";
  if (existsSync(assetsDir)) {
    for (const f of readdirSync(assetsDir)) {
      if (f.endsWith(".js") && statSync(join(assetsDir, f)).size < 5_000_000) {
        bundleText += readFileSync(join(assetsDir, f), "utf8");
      }
    }
  }
  for (const key of REQUIRED_ENV) {
    const expected = process.env[key];
    if (!expected) {
      warnings.push(`env ${key}: not set in current shell — cannot verify it was injected at build time`);
      continue;
    }
    check(`bundle contains ${key} value`, bundleText.includes(expected), `Built bundle does not include ${key}. Rebuild with .env.production set.`);
  }
  for (const key of OPTIONAL_ENV) {
    if (!process.env[key]) warnings.push(`optional env ${key} not set — payments client token may be missing in build`);
  }

  // Sanity: bundle must NOT reference the Lovable preview URL
  const previewMatch = bundleText.match(/lovableproject\.com|id-preview--/);
  check("bundle has no Lovable preview URLs", !previewMatch, "Bundle still references the Lovable preview host. Check capacitor.config.ts and any hardcoded URLs (e.g. WEB_ORIGIN in src/lib/platform.ts).");
}

// 5. PWA assets
for (const asset of ["manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]) {
  check(`public/${asset}`, existsSync(join(ROOT, "public", asset)), `Missing — needed for installable web + native splash/icon fallbacks.`, true);
}

// 6. iOS Info.plist (only if ios platform was added)
const infoPlist = join(ROOT, "ios", "App", "App", "Info.plist");
if (existsSync(infoPlist)) {
  const plist = readFileSync(infoPlist, "utf8");
  check("iOS: CFBundleURLSchemes contains a custom scheme", /CFBundleURLSchemes/.test(plist), "Add a custom URL scheme (e.g. onlycoach) for deep links.", true);
  const atsBlock = plist.match(/NSAppTransportSecurity[\s\S]*?<\/dict>/);
  if (atsBlock && /NSAllowsArbitraryLoads.*?<true\/>/s.test(atsBlock[0])) {
    warnings.push("iOS: NSAllowsArbitraryLoads = true. Apple may reject. Restrict to specific domains.");
  } else {
    ok.push("iOS: NSAppTransportSecurity not blanket-disabled");
  }
} else {
  warnings.push("iOS platform not added (run `npx cap add ios`) — iOS checks skipped");
}

// 7. Android manifest
const manifest = join(ROOT, "android", "app", "src", "main", "AndroidManifest.xml");
if (existsSync(manifest)) {
  const xml = readFileSync(manifest, "utf8");
  check("Android: INTERNET permission", /android\.permission\.INTERNET/.test(xml), "Add <uses-permission android:name=\"android.permission.INTERNET\"/>.");
  check("Android: deep-link intent-filter", /android:scheme="https?"|android:scheme="onlycoach"/.test(xml), "Add intent-filter for your https domain or custom scheme so push deep links open the app.", true);
  check("Android: usesCleartextTraffic not enabled", !/android:usesCleartextTraffic="true"/.test(xml), "Disable cleartext traffic for release.");
} else {
  warnings.push("Android platform not added (run `npx cap add android`) — Android checks skipped");
}

// Report
console.log("\nMOBILE PREFLIGHT");
console.log("================");
for (const o of ok) console.log("  ✓ " + o);
for (const w of warnings) console.log("  ! " + w);
for (const e of errors) console.log("  ✗ " + e);
console.log(`\n${ok.length} ok, ${warnings.length} warnings, ${errors.length} errors`);
process.exit(errors.length ? 1 : 0);
