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
  { handle: "maya_id",  email: "maya.coach@onlycoach.test",  display: "Maya Lestari",      niche: "Strength",  bio: "Strength coach. 12 years training Indonesian athletes." },
  { handle: "budi_id",  email: "budi.coach@onlycoach.test",  display: "Budi Santoso",      niche: "Business",  bio: "Solo founder coach. Helping UMKM go from idea to first IDR 100M." },
  { handle: "aisyah_id",email: "aisyah.coach@onlycoach.test",display: "Aisyah Rahmawati",  niche: "Mindset",   bio: "Habit & performance coach for ambitious creators." },
  { handle: "rizky_id", email: "rizky.coach@onlycoach.test", display: "Rizky Pratama",     niche: "Endurance", bio: "Marathon coach — first-time runners through ultra athletes." },
  { handle: "sari_id",  email: "sari.coach@onlycoach.test",  display: "Sari Hidayat",      niche: "Nutrition", bio: "Sports dietitian. Pragmatic, food-first nutrition for Indonesian palates." },
];

const MENTEES = Array.from({ length: 10 }).map((_, i) => ({
  email: `fan${i + 1}@onlycoach.test`,
  display: `Fan ${i + 1}`,
  handle: `fan_${i + 1}`,
}));

const TIER_PRESETS = [
  { name: "Basic",  price_cents: 14900,  perks: ["Weekly post", "Community access"] },
  { name: "Pro",    price_cents: 29900,  perks: ["Daily posts", "DM access", "Form-check video"] },
  { name: "VIP",    price_cents: 49900,  perks: ["Everything in Pro", "Monthly 1:1 call", "Custom plan"] },
];

const POST_BODIES = [
  "Reminder: jadwal latihan minggu ini sudah dibuka. Cek kalender.",
  "Free preview — three habits I'd install first if I were starting today.",
  "Rest day audit: durasi tidur, asupan air, mood. Reply with yours.",
  "Form-check window opens Friday. Drop your video in DMs.",
  "Q&A audio is live for VIP — link in your messages.",
];

async function ensureUser({ email, display, handle, role }) {
  // create or fetch a user via admin API
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
  // backfill role if asked
  if (role) {
    await supabase.from("user_roles").upsert({ user_id: data.user.id, role }, { onConflict: "user_id,role" });
  }
  return data.user.id;
}

async function seedCoach(coach) {
  const userId = await ensureUser({ ...coach, role: "coach" });

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

  // posts
  const { data: existingPosts } = await supabase
    .from("posts").select("id").eq("coach_id", userId).limit(1);
  if (!existingPosts || existingPosts.length === 0) {
    await supabase.from("posts").insert(
      POST_BODIES.slice(0, 3).map((body, i) => ({
        coach_id: userId,
        body,
        media_type: "text",
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
    // each coach gets ~3 random subscribers
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

  console.log("Done.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
