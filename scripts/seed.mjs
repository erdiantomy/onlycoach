#!/usr/bin/env node
/**
 * Supabase seed script — populates the database with realistic
 * Indonesian-market test data so the app doesn't look empty.
 *
 * Required env (read from .env or shell):
 *   SUPABASE_URL                — your project URL
 *   SUPABASE_SERVICE_ROLE_KEY   — service-role key (bypasses RLS; keep secret)
 *
 * Run:
 *   node scripts/seed.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---- env loading (no extra deps; .env > shell) ----
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, "");
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  console.error("Add them to .env or export them in your shell, then re-run.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---- seed plan: 5 coaches, 10 mentees, tiers, posts, 2 challenges ----
const COACHES = [
  { handle: "maya_id",   email: "maya.coach@onlycoach.test",   display: "Maya Lestari",     niche: "Strength",  bio: "Strength coach. 12 years training Indonesian athletes." },
  { handle: "budi_id",   email: "budi.coach@onlycoach.test",   display: "Budi Santoso",     niche: "Business",  bio: "Solo founder coach. Helping UMKM go from idea to first IDR 100M." },
  { handle: "aisyah_id", email: "aisyah.coach@onlycoach.test", display: "Aisyah Rahmawati", niche: "Mindset",   bio: "Habit & performance coach for ambitious creators." },
  { handle: "rizky_id",  email: "rizky.coach@onlycoach.test",  display: "Rizky Pratama",    niche: "Endurance", bio: "Marathon coach — first-time runners through ultra athletes." },
  { handle: "sari_id",   email: "sari.coach@onlycoach.test",   display: "Sari Hidayat",     niche: "Nutrition", bio: "Sports dietitian. Pragmatic, food-first nutrition for Indonesian palates." },
];

const MENTEES = Array.from({ length: 10 }).map((_, i) => ({
  email: `fan${i + 1}@onlycoach.test`,
  display: `Fan ${i + 1}`,
  handle: `fan_${i + 1}`,
}));

// IDR cents: 149.000, 299.000, 499.000
const TIER_PRESETS = [
  { name: "Basic", price_cents: 14900,  perks: ["Weekly post", "Community access"] },
  { name: "Pro",   price_cents: 29900,  perks: ["Daily posts", "DM access", "Form-check video"] },
  { name: "VIP",   price_cents: 49900,  perks: ["Everything in Pro", "Monthly 1:1 call", "Custom plan"] },
];

// 4 posts per coach — varied media_type so Feed looks real
const POST_TEMPLATES = [
  { body: "Reminder: jadwal latihan minggu ini sudah dibuka. Cek kalender.", media_type: "text" },
  { body: "Free preview — three habits I'd install first if I were starting today.", media_type: "image" },
  { body: "Rest day audit: durasi tidur, asupan air, mood. Reply with yours.", media_type: "text" },
  { body: "Form-check window opens Friday. Drop your video in DMs.", media_type: "video" },
];

function dicebearAvatar(seed) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;
}

async function ensureUser({ email, display, handle, role }) {
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: "DemoPass!234",
    email_confirm: true,
    user_metadata: { display_name: display, handle },
  });
  if (error) throw error;
  if (role) {
    await supabase.from("user_roles").upsert({ user_id: data.user.id, role }, { onConflict: "user_id,role" });
  }
  return data.user.id;
}

async function seedCoach(coach) {
  const userId = await ensureUser({ ...coach, role: "coach" });

  // backfill avatar_url on the profile row
  await supabase.from("profiles").upsert({
    id: userId,
    handle: coach.handle,
    display_name: coach.display,
    bio: coach.bio,
    avatar_url: dicebearAvatar(coach.display),
  }, { onConflict: "id" });

  await supabase.from("coach_profiles").upsert({
    user_id: userId,
    niche: coach.niche,
    rating: 4.8,
    is_published: true,
  }, { onConflict: "user_id" });

  // tiers
  const { data: existingTiers } = await supabase
    .from("subscription_tiers").select("id, name").eq("coach_id", userId);
  if (!existingTiers || existingTiers.length === 0) {
    await supabase.from("subscription_tiers").insert(
      TIER_PRESETS.map((t, i) => ({
        coach_id: userId,
        name: t.name,
        price_cents: t.price_cents,
        perks: t.perks,
        sort_order: i,
        is_active: true,
      })),
    );
  }

  // posts with varied media_type
  const { data: existingPosts } = await supabase
    .from("posts").select("id").eq("coach_id", userId).limit(1);
  if (!existingPosts || existingPosts.length === 0) {
    await supabase.from("posts").insert(
      POST_TEMPLATES.map((tpl, i) => ({
        coach_id: userId,
        body: tpl.body,
        media_type: tpl.media_type,
        required_tier_id: null,
        like_count: 10 + i * 7,
        comment_count: 2 + i,
      })),
    );
  }

  return userId;
}

async function seedChallenges(coachIds) {
  const { data: existing } = await supabase.from("challenges").select("id").limit(1);
  if (existing && existing.length > 0) {
    console.log("  challenges already seeded");
    return;
  }
  const challenges = [
    {
      coach_id: coachIds[0],
      title: "30-Day Strength Reset",
      description: "Rebuild your squat, bench, deadlift base with daily programming.",
      price_cents: 79000,
      duration_days: 30,
      max_participants: 200,
      status: "open",
    },
    {
      coach_id: coachIds[2],
      title: "21-Day Habit Foundation",
      description: "Install three durable daily habits without burnout.",
      price_cents: 49000,
      duration_days: 21,
      max_participants: 500,
      status: "open",
    },
  ];
  const { data, error } = await supabase.from("challenges").insert(challenges).select();
  if (error) throw error;
  for (const ch of data ?? []) {
    await supabase.from("challenge_curriculum").insert([
      { challenge_id: ch.id, day_number: 1, title: "Welcome + assessment", lesson_type: "video" },
      { challenge_id: ch.id, day_number: 2, title: "Day 2 lesson",          lesson_type: "text" },
      { challenge_id: ch.id, day_number: 3, title: "Day 3 lesson",          lesson_type: "text" },
    ]);
  }
}

async function seedCommunityPosts(coachIds) {
  const { data: existing } = await supabase.from("community_posts").select("id").limit(1);
  if (existing && existing.length > 0) {
    console.log("  community_posts already seeded");
    return;
  }
  const posts = [
    { user_id: coachIds[0], coach_id: coachIds[0], body: "Selamat datang di komunitas! Perkenalkan diri kalian di sini.", is_announcement: true },
    { user_id: coachIds[0], coach_id: coachIds[0], body: "Tips minggu ini: tidur 7–8 jam adalah program terbaik yang bisa kamu jalankan sekarang.", is_announcement: false },
    { user_id: coachIds[1], coach_id: coachIds[1], body: "Thread: share satu win bisnis kamu minggu ini, sekecil apapun itu.", is_announcement: false },
    { user_id: coachIds[2], coach_id: coachIds[2], body: "Challenge harian: tulis 3 hal yang kamu syukuri sebelum tidur. Tiga hari berturut-turut.", is_announcement: false },
    { user_id: coachIds[3], coach_id: coachIds[3], body: "Race week reminder: taper bukan berarti malas. Percayai proses latihanmu.", is_announcement: true },
  ];
  const { error } = await supabase.from("community_posts").insert(posts);
  if (error) throw error;
}

async function seedReferralCode(coachId) {
  const { data: existing } = await supabase
    .from("referral_codes").select("id").eq("coach_id", coachId).limit(1);
  if (existing && existing.length > 0) {
    console.log("  referral code already seeded for first coach");
    return;
  }
  const code = "MAYA10";
  const { error } = await supabase.from("referral_codes").insert({
    coach_id: coachId,
    code,
    discount_pct: 10,
    max_uses: 100,
    uses: 0,
    is_active: true,
  });
  if (error) {
    // non-fatal — referral_codes table may not exist yet in this environment
    console.warn("  ⚠ Could not seed referral code:", error.message);
  }
}

async function seedSubscriptions(coachIds, menteeIds) {
  const { data: tiers } = await supabase
    .from("subscription_tiers").select("id, coach_id, sort_order");
  if (!tiers) return;
  const byCoach = new Map();
  for (const t of tiers) {
    if (!byCoach.has(t.coach_id)) byCoach.set(t.coach_id, []);
    byCoach.get(t.coach_id).push(t);
  }
  for (const coachId of coachIds) {
    const coachTiers = (byCoach.get(coachId) ?? []).sort((a, b) => a.sort_order - b.sort_order);
    if (coachTiers.length === 0) continue;
    for (let i = 0; i < 3; i++) {
      const mentee = menteeIds[(coachIds.indexOf(coachId) * 3 + i) % menteeIds.length];
      const tier = coachTiers[i % coachTiers.length];
      await supabase.from("subscriptions").upsert({
        mentee_id: mentee,
        coach_id: coachId,
        tier_id: tier.id,
        status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      }, { onConflict: "mentee_id,coach_id" });
    }
  }
}

async function main() {
  console.log("Seeding coaches…");
  const coachIds = [];
  for (const coach of COACHES) {
    const id = await seedCoach(coach);
    console.log("  ✓", coach.display, id);
    coachIds.push(id);
  }

  console.log("Seeding mentees…");
  const menteeIds = [];
  for (const mentee of MENTEES) {
    const id = await ensureUser({ ...mentee, role: "mentee" });
    menteeIds.push(id);
  }
  console.log(`  ✓ ${menteeIds.length} mentees`);

  console.log("Seeding subscriptions…");
  await seedSubscriptions(coachIds, menteeIds);

  console.log("Seeding challenges…");
  await seedChallenges(coachIds);

  console.log("Seeding community posts…");
  await seedCommunityPosts(coachIds);

  console.log("Seeding referral code…");
  await seedReferralCode(coachIds[0]);

  console.log("Done.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
