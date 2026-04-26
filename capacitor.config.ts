import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config for ONLY/COACH iOS + Android shells.
 *
 * The `server.url` block enables hot-reload from the Lovable sandbox during
 * development — but if it ships in a release binary, the App Store / Play
 * Store app will load the preview URL forever instead of the bundled
 * `dist/` assets. That's a guaranteed outage waiting to happen.
 *
 * To make this safe we pick the config based on the build environment:
 *
 *   - DEV (default): include `server.url` → hot-reload from Lovable preview.
 *   - RELEASE (`CAP_ENV=production` or `NODE_ENV=production`): omit the
 *     `server` block entirely so Capacitor falls back to `webDir: "dist"`.
 *
 * The release build pipeline (see `scripts/mobile-preflight.mjs` and
 * `MOBILE_RELEASE.md`) sets `CAP_ENV=production` before running
 * `npx cap sync` / `npx cap copy`, so the generated native config is
 * always production-safe without manual edits.
 *
 * Override knobs:
 *   CAP_ENV=production       force release config
 *   CAP_ENV=development      force dev config (overrides NODE_ENV)
 *   CAP_DEV_URL=https://...  override the dev hot-reload URL
 */

const DEFAULT_DEV_URL =
  "https://7ee943ba-1d4f-47bd-8b62-cc3bdd6d90c4.lovableproject.com?forceHideBadge=true";

const capEnv = (process.env.CAP_ENV ?? "").toLowerCase();
const isProduction =
  capEnv === "production" ||
  capEnv === "release" ||
  (capEnv === "" && process.env.NODE_ENV === "production");

const baseConfig: CapacitorConfig = {
  appId: "app.lovable.7ee943ba1d4f47bd8b62cc3bdd6d90c4",
  appName: "ONLY COACH",
  webDir: "dist",
  ios: {
    contentInset: "always",
    backgroundColor: "#d9d3bc",
  },
  android: {
    backgroundColor: "#d9d3bc",
  },
};

const config: CapacitorConfig = isProduction
  ? baseConfig
  : {
      ...baseConfig,
      server: {
        url: process.env.CAP_DEV_URL ?? DEFAULT_DEV_URL,
        cleartext: true,
      },
    };

// Surface the choice in the Capacitor CLI output so misconfigurations are
// obvious during sync / copy / build.
// eslint-disable-next-line no-console
console.log(
  `[capacitor.config] mode=${isProduction ? "production" : "development"}` +
    (isProduction ? " (server.url omitted — bundled dist/ will be used)" : ` (server.url=${(config as any).server?.url})`),
);

export default config;
