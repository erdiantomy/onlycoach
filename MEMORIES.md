# MEMORIES.md — ONLY/COACH

Running log of significant findings, decisions, and known issues. New entries at the **top**. When work moves from "known issue" → "fixed", strike through and link the commit.

---

## 2026-05-02 — Repo vs production drift

**Important context for any future fix work:** the live build at https://onlycoach.co is from a **more advanced branch** than what's in `main`/this repo. Production has these routes that don't exist here:

- `/community`
- `/saved`
- `/studio/analytics`
- `/studio/subscribers`
- `/studio/payouts`
- `/studio/referrals`
- `/studio/challenges`
- `/studio/broadcast`

Bugs found in those routes during the QA pass (FK-name typos, fictional referrals, etc.) **cannot be fixed from this repo** — they live on whatever branch is currently deployed. Confirm with the team which branch is prod before attempting fixes there.

---

## 2026-05-02 — Lovable launch-prep prompt

A long, paste-ready Lovable prompt for everything still missing for launch is in the chat history under "Lovable prompt — make ONLY/COACH launch-ready". Paste sections one at a time if Lovable times out on the full prompt. Key remaining buckets:

1. Replace mock data with real Supabase queries everywhere (Discover, CoachProfile, Feed, Messages, Sessions, Me).
2. Build coach tier + availability + studio sub-routes (subscribers, payouts, analytics, broadcast).
3. Real file upload for posts via the existing `signed-media-url` edge function.
4. Stripe Connect / Xendit payout onboarding for coaches.
5. Mentee subscription management UI in `/settings`.
6. Notification preferences table + UI.
7. Branded sender domain (`noreply@onlycoach.co`, not `noreply@notify.nosecret.co`).
8. Apple OAuth or remove the button.
9. Profile avatar upload.
10. Bahasa Indonesia full coverage or remove the language switch.
11. Capacitor mobile preflight + IAP gating verification.
12. Bundle splitting + meta tags + sitemap.
13. Moderation flow (report / block / admin).

---

## 2026-05-02 — QA pass on https://onlycoach.co (production)

Full senior-QA E2E run via Playwright MCP. Disposable mailinator inboxes for signup. Tested as both fresh mentee and fresh coach. Stopped at checkout pages (no real charges). 2 test accounts left in prod DB and need cleanup:

- mentee: `qa-mentee-oc1777743334@mailinator.com` / `QaMenteeTest!2026` (handle `qa_mentee_test`, user-id `a5970d1b-7aab-414b-8462-27f9608867e8`)
- coach: `qa-coach-oc1777743655@mailinator.com` / `QaCoachTest!2026` (handle `qa_coach_test`, user-id `53ce5963-660b-4eef-983a-5ff0feb0bd95`) — and one `[QA TEST]` post under that account

### Bugs found, severity-ranked

#### P0

- **QA-001**: All "Featured / Discover" coaches (maya, theo, ines, diego, sara, lucas) lead to 404 on click. Supabase returns 400 on the `coach_profiles!inner(...)` join because no row exists. Discovery → subscribe → book → message journey is fully blocked. **Status: prod-only. Fix needs `coach_profiles` rows seeded for the demo handles, OR Discover converted to query real published coaches only.**
- **QA-002**: Coach onboarding `POST /rest/v1/user_roles` returns 403 (RLS rejects authenticated users from inserting their own role). **Status: ✅ fixed** in commit `21989bf` — added `users add own non-admin role` policy in migration `20260502180000_*.sql`.
- **QA-003**: `/studio/*` accessible without coach role (mentee-only or role-less account can browse the coach dashboard, even create posts). **Status: ✅ fixed** in commit `666d145` via new `RequireRole` wrapper in `App.tsx`.
- **QA-004**: Public coach profile 404 even for newly-onboarded coaches because `coach_profiles` insert never ran (downstream of QA-002). **Status: ✅ fixed** by QA-002 fix in this repo. Production still affected until prod RLS is migrated.
- **QA-005**: `/studio/referrals` shows fictional referrals (Theo Lindberg, Sara Halim) and IDR 4.416.000 earnings to **every** account, including brand-new ones. Major trust / financial-statement issue. **Status: prod-only. Fix needs the page to query real `referrals` data scoped to the current user, or be removed entirely.**

#### P1

- **QA-101**: Auth + profile + onboarding forms produce **zero feedback** on submit — no toast, no inline error, no spinner-finish, on any state (success, validation error, server error, 429). Users mash buttons and trip rate limits. **Status: this repo already wires `toast.success/error` correctly; production deploy must be from a branch that broke it. ✅ for this repo.**
- **QA-102**: Email confirmation comes from `noreply@notify.nosecret.co` — unrelated brand, trips spam filters. **Status: infra fix, not code. Configure Supabase Auth SMTP to send from `noreply@onlycoach.co` with proper SPF/DKIM/DMARC.**
- **QA-103**: `/community` link in public top-nav redirects logged-out users to `/auth`. **Status: ✅ fixed in this repo's TopNav** — auth-only links now hidden when logged out. Prod still affected.
- **QA-104**: 4× failed Supabase queries on `/community` and 3× on `/studio/subscribers` from malformed FK join names (`subscriptions_coach_id_fkey`, `subscriptions_mentee_id_fkey`). Empty state still renders but logs are noisy and pages can't load real data. **Status: prod-only. Fix is to verify the actual constraint name with `select * from information_schema.table_constraints where table_name='subscriptions'` and use the correct join syntax in the query.**
- **QA-105**: Landing hero card "Subscribe — IDR 304.000/mo" and "Message coach" buttons are dead — no nav, no toast, no console error. **Status: ✅ fixed** in commit `666d145` — both now Link to real coach handles.
- **QA-106**: `/terms` and `/privacy` are placeholder copy ("Replace with your final … document before launch"). Compliance / legal risk — users agree to placeholder text on signup. **Status: ✅ fixed** in commit `2f756d0` — real v1 Terms + Privacy in `Legal.tsx`.
- **QA-107**: `/settings` Billing, Payouts, Notifications all show "Coming soon". Mentees with active paid subs have no UI to cancel — chargeback magnet. **Status: partially ✅ fixed** in `666d145` — Settings rewritten with real Profile editor, Account password reset, Subscriptions link-out. Real billing list + notifications toggles are in the Lovable launch prompt.
- **QA-108**: `?role=coach` on signup URL has no effect — same form, same `redirect_to=/feed`, user lands on `/feed` and must self-navigate to `/onboarding` to pick coach. **Status: ✅ fixed** in commit `666d145` — Auth.tsx propagates `role=coach` through `emailRedirectTo` and post-login navigation; Onboarding reads `?role=coach` from URL.

#### P2

- **QA-201**: Currency mismatch — `/studio` dashboard widget shows `$0 Monthly revenue`; `/studio/analytics` and `/studio/payouts` use IDR; landing/discover use IDR. **Status: ✅ fixed** in commit `666d145` for this repo via `lib/currency.ts`. Prod has more studio sub-routes that still need the helper applied.
- **QA-202**: i18n is partial — switching to Bahasa Indonesia only translates the Language section heading itself. Either ship full translations or hide the switch. **Status: not fixed; covered in Lovable prompt § 10.**
- **QA-203**: Logged-in users still see the marketing landing on `/` with "Start as a mentee" / "Create your account" CTAs. **Status: ✅ fixed** in commit `666d145` — Index redirects logged-in users to `/feed`.
- **QA-204**: Coach studio greeter "Welcome back, QA." truncates `split(' ')[0]`. Breaks for "Dr. Maya" → "Welcome back, Dr.". **Status: ✅ fixed** in commit `666d145` — `firstName()` helper strips honorifics + punctuation.
- **QA-205**: Onboarding niche dropdown defaults to "Other" — worst possible default for discovery. **Status: ✅ fixed** in commit `666d145` — default is empty, `Pick your niche…` placeholder, niche required before save.
- **QA-206**: Featured-coach subscriber counts (1248, 932, 2105, 1410) are seed values for accounts that 404 on click. Combined with the "Verified coaches" trust badge, borders on misrepresentation. **Status: data fix — replace mock seed with real coaches once Discover queries DB (Lovable prompt § 1).**
- **QA-207**: `/reset-password` reachable directly without recovery token; form would fail silently. **Status: ✅ fixed** in commit `666d145` — detects `PASSWORD_RECOVERY` event / existing session; shows "request a new reset email" fallback when missing.

#### P3

- **QA-301**: Page `<title>` never changes per route. **Status: ✅ fixed** in commit `2f756d0` — `usePageTitle` hook applied across every page.
- **QA-302**: "Drop **a** image here" on NewPost upload area — wrong article. **Status: ✅ fixed** in commit `666d145` — per-media `dropArticle` field.
- **QA-303**: Password input lacks `autocomplete` attribute. **Status: ✅ fixed** in commit `666d145` — `current-password` / `new-password` / `email` / `name` autocomplete attrs added.

---

## 2026-05-02 — Playwright MCP setup

Installed `@playwright/mcp@latest` so any session can drive a real browser for QA. Two artifacts in repo:

- `.claude/settings.json` — registers the SessionStart hook.
- `.claude/hooks/session-start.sh` — idempotent. Gated on `CLAUDE_CODE_REMOTE=true` (no-op on local). Runs `claude mcp add playwright --scope user -- npx -y @playwright/mcp@latest --ignore-https-errors`.

The `--ignore-https-errors` flag is required because the Claude Code remote sandbox uses an MITM TLS-inspection proxy whose CA isn't in Chrome's NSS store. Without that flag every navigate fails `ERR_CERT_AUTHORITY_INVALID`.

`.playwright-mcp/` (snapshot YAMLs and console logs the MCP writes per call) is gitignored.

---

## Conventions discovered the hard way

- **Onboarding double-insert**: `handle_new_user()` trigger always inserts `('mentee')` into `user_roles`. Coach upgrade INSERTs `('coach')` alongside. Treat unique-violation (Postgres `23505`) on the second insert as a no-op, not an error — the user just clicked Finish twice.
- **Sender domain is shared infra**: emails come from `noreply@notify.nosecret.co` because that's the SMTP relay configured at the Supabase project level. Changing it requires Supabase dashboard access, not code. Ask before assuming you can fix it from the repo.
- **Mock data is load-bearing**: until Discover/Feed/Messages/Sessions are converted to real DB queries (Lovable prompt § 1), removing entries from `lib/mock.ts` will blank out major surfaces. Migrate then prune, not the other way around.
- **Hero card is wired to first featured coach**: `Index.tsx` reads `coaches[0]` for the hero CTA buttons. If you reorder `mock.ts`, the hero coach changes silently.
- **`isCheckoutBlockedOnDevice()` is Apple IAP compliance**: hides Subscribe buttons on iOS to avoid App Store rejection. Don't disable without reading `MOBILE_RELEASE.md`.

---

## Not fixed in this branch (deliberate)

These showed up in QA but were left alone because they're either prod-only (this repo can't reach them), need product input, or are too large for a fix-pass:

- All `/community`, `/studio/referrals`, `/studio/subscribers`, `/studio/payouts`, `/studio/analytics`, `/studio/broadcast`, `/studio/challenges` features (don't exist in repo).
- File upload on NewPost (Image / Video / PDF) — UI is a static drop area, no signed-URL upload wired.
- Discover / CoachProfile still read from `lib/mock.ts`.
- No real notification preferences table/UI.
- No Stripe Connect / Xendit payout onboarding UI for coaches.
- Apple OAuth not wired in this repo (production has the button).
- Profile avatar upload not wired.
- Bahasa Indonesia translation coverage is incomplete.

The Lovable prompt above covers all of these.
