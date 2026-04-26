import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config for ONLY/COACH iOS + Android shells.
 *
 * `server.url` points at the Lovable sandbox preview so the native app
 * hot-reloads from the same source as web — guaranteeing UI/UX parity.
 * Remove `server` block before submitting to App Store / Play Store; then
 * the app loads the bundled `dist/` produced by `npm run build`.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.7ee943ba1d4f47bd8b62cc3bdd6d90c4",
  appName: "ONLY COACH",
  webDir: "dist",
  server: {
    url: "https://7ee943ba-1d4f-47bd-8b62-cc3bdd6d90c4.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#d9d3bc",
  },
  android: {
    backgroundColor: "#d9d3bc",
  },
};

export default config;
