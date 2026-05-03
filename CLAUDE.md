# CLAUDE.md — ONLY/COACH

Project guide for Claude Code sessions. Keep this file short and high-signal: anything in here is loaded into every session's context. For longer narratives (QA findings, decision logs, post-mortems) use `MEMORIES.md`.

## What this is

A peer-to-peer coaching platform at https://onlycoach.co. Coaches publish content + sell tier-based subscriptions and 1:1 sessions; mentees subscribe, consume content, message, and book.

## Stack

- **Frontend:** Vite + React 18 + TypeScript, React Router v6 (SPA), TailwindCSS + shadcn/ui (Radix), Tanstack Query, React Hook Form + Zod
- **Backend:** Supabase (Postgres + Auth + Realtime + Edge Functions, all in one project: `opkxskndxpuzdevleect`)
- **Payments:** Stripe (global) and Xendit (Indonesia)
- **Mobile:** Capacitor (iOS + Android)
- **Toasts:** `sonner` — `import { toast } from "sonner"`. Do NOT introduce the older shadcn `useToast` for new code.

## Currency

Default currency is **IDR** (Indonesian Rupiah). Always use the helper:

```ts
import { formatCurrency, formatPerMonth } from "@/lib/currency";
formatCurrency(304_000);          // "IDR 304.000" (id-ID grouping)
formatPerMonth(304_000);          // "IDR 304.000/mo"
formatCurrency(19, "USD", "en-US"); // override for non-IDR tiers
```

Never hardcode `$` in JSX. Never use `toLocaleString()` on a price.

## Auth + role gating

- `useSession()` (from `@/hooks/useSession`) — central auth state.
- `<RequireAuth>` — wraps any logged-in-only route.
- `<RequireRole role="coach">` — wraps coach-only routes (e.g. `/studio*`). Non-coaches redirect to `/onboarding` so they can opt in.
- `handle_new_user()` trigger auto-inserts a `mentee` row in `user_roles` at signup (SECURITY DEFINER, bypasses RLS). Coach upgrade happens client-side in `Onboarding.tsx` via the self-insert RLS policy added in `20260502180000_*.sql`.
- Users may hold multiple roles simultaneously.

## RLS rules to remember

- `user_roles`: users can read + insert + delete their **own non-admin** role rows. Admin role insertion is admin-only.
- `profiles`: public read, owner write.
- `coach_profiles`: published coaches readable by all; owner can insert/update.
- `subscriptions`: visible to participants only (mentee or coach).
- `posts`: free posts visible to all; locked posts visible to coach + active subscribers of the required tier.

When changing a policy, write a new migration file under `supabase/migrations/<YYYYMMDDHHMMSS>_*.sql`. Never edit an existing migration that's already shipped.

## Branch + commit policy

- Active branch for the current line of work: **`claude/install-playwright-mcp-ZBR9p`** (Playwright MCP install + QA fixes).
- Always `git push -u origin <branch>`. Retry up to 4 times with exponential backoff on network errors.
- Commit messages: imperative subject (≤ 72 chars), explain the **why** in the body.
- Don't run `git config`, `git push --force` to main, `--no-verify`, or `--no-gpg-sign` without explicit instruction.
- Don't create PRs unless explicitly asked.

## Commands

```bash
npm run dev             # Vite dev server
npm run build           # production build (currently ~616 KB single chunk — needs splitting)
npm run lint            # ESLint
npm test                # vitest run (unit tests, not E2E)
npm run mobile:preflight # before iOS/Android release
```

## Repo conventions

- Page components: `src/pages/<Name>.tsx`, default-export.
- Auth-only routes are wrapped in `<RequireAuth>` in `src/App.tsx`. Coach-only routes also wrapped in `<RequireRole role="coach">`.
- Per-route `<title>`: `usePageTitle("…")` from `@/hooks/usePageTitle`. Hook handles the `· ONLY/COACH` suffix.
- Mock data lives in `src/lib/mock.ts`. **Treat it as a temporary fixture, not a data source.** Real screens should query Supabase. See `MEMORIES.md` for the Discover/Feed/Messages/Sessions migration plan.
- Toast on success and error — silent forms are a P1 bug (see QA-101 in `MEMORIES.md`).

## Don't

- Don't add features, refactors, or abstractions beyond what was asked.
- Don't write multi-line code comments. Inline `WHY` notes for non-obvious invariants only.
- Don't reintroduce `$` literals — use `formatCurrency`.
- Don't bypass `RequireRole` on coach routes.
- Don't write inline policy SQL in code paths — always a new migration file.
- Don't commit secrets. The Supabase publishable anon key in `.env` is safe; the service role key is not (and should never be in this repo).
- Don't touch the Capacitor IAP gating in `lib/checkout.ts` (`isCheckoutBlockedOnDevice`) without testing on iOS — Apple will reject the app if subscriptions bypass IAP.

## Playwright MCP

A SessionStart hook (`.claude/hooks/session-start.sh`) registers `@playwright/mcp@latest` at the start of every Claude Code remote session. The browser is launched with `--ignore-https-errors` to work behind the sandbox MITM proxy. Tools live under `mcp__playwright__browser_*`. See `MEMORIES.md` § "QA tooling setup" for context.

## Where to find things

| Need | Path |
|---|---|
| Routing | `src/App.tsx` |
| Auth state | `src/hooks/useSession.ts` |
| Auth gates | `src/components/auth/RequireAuth.tsx`, `RequireRole.tsx` |
| Currency | `src/lib/currency.ts` |
| Page title hook | `src/hooks/usePageTitle.ts` |
| Mock fixtures | `src/lib/mock.ts` |
| Supabase client | `src/integrations/supabase/client.ts` |
| Supabase types | `src/integrations/supabase/types.ts` |
| Edge functions | `supabase/functions/<name>/index.ts` |
| Migrations | `supabase/migrations/<timestamp>_*.sql` |
| Top nav | `src/components/layout/TopNav.tsx` |
| Legal copy | `src/pages/Legal.tsx` |
| Plan files | `/root/.claude/plans/` (out-of-tree) |

## When in doubt

Read `MEMORIES.md` for the QA history and the Lovable launch-prep prompt. It records every known bug, the fix already shipped, and what's deliberately left for follow-up.
