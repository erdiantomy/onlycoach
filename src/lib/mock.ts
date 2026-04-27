/**
 * Mock data layer for ONLY/COACH UI shells.
 * Used by Discover/Feed/Messages/Sessions until live Cloud queries replace each surface.
 */

export type Niche = "Strength" | "Mindset" | "Endurance" | "Nutrition" | "Yoga" | "Business";

export interface Tier {
  id: string;
  name: string;
  price: number;
  perks: string[];
}

export interface Coach {
  id: string;
  handle: string;
  name: string;
  niche: Niche;
  headline: string;
  bio: string;
  rating: number;
  subscribers: number;
  tiers: Tier[];
}

export interface Post {
  id: string;
  coachId: string;
  body: string;
  createdAt: string;
  requiredTier: string | null;
  mediaType: "text" | "image" | "video" | "pdf";
  likes: number;
  comments: number;
}

export interface Conversation {
  id: string;
  coachId: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export interface Message {
  id: string;
  conversationId: string;
  fromCoach: boolean;
  body: string;
  at: string;
}

export interface Booking {
  id: string;
  coachId: string;
  startsAt: string;
  durationMin: number;
  price: number;
  status: "upcoming" | "completed" | "cancelled";
}

export const coaches: Coach[] = [
  { id: "c1", handle: "maya", name: "Maya Okafor", niche: "Strength", headline: "Powerlifter & hypertrophy coach", bio: "10 years coaching strength athletes. Programs built around progressive overload and recovery.", rating: 4.9, subscribers: 1248, tiers: [
    { id: "t1", name: "Basic", price: 19, perks: ["Weekly post", "Community access"] },
    { id: "t2", name: "Pro", price: 39, perks: ["Daily posts", "Direct messages", "Form check videos"] },
    { id: "t3", name: "VIP", price: 99, perks: ["Everything in Pro", "Monthly 1:1 call", "Custom program"] },
  ]},
  { id: "c2", handle: "theo", name: "Theo Lindberg", niche: "Mindset", headline: "Habit & performance coach", bio: "Helping high-performers build durable habits without burnout.", rating: 4.8, subscribers: 932, tiers: [
    { id: "t1", name: "Basic", price: 24, perks: ["Weekly framework", "Reading list"] },
    { id: "t2", name: "Pro", price: 59, perks: ["DM access", "Weekly Q&A audio"] },
  ]},
  { id: "c3", handle: "ines", name: "Ines Kovač", niche: "Endurance", headline: "Marathon & ultra coach", bio: "Sub-2:35 marathoner. Programs for first-time marathoners through elite ultra runners.", rating: 4.9, subscribers: 2105, tiers: [
    { id: "t1", name: "Run Club", price: 15, perks: ["Weekly plan", "Community"] },
    { id: "t2", name: "Athlete", price: 49, perks: ["Custom plan", "DM check-ins"] },
  ]},
  { id: "c4", handle: "diego", name: "Diego Ramos", niche: "Nutrition", headline: "Sports nutritionist", bio: "RD focused on physique sport. Pragmatic, food-first nutrition.", rating: 4.7, subscribers: 690, tiers: [
    { id: "t1", name: "Basic", price: 22, perks: ["Weekly meal ideas"] },
    { id: "t2", name: "Pro", price: 79, perks: ["Custom macros", "Weekly check-in"] },
  ]},
  { id: "c5", handle: "sara", name: "Sara Halim", niche: "Yoga", headline: "Vinyasa & breathwork", bio: "Daily flows for stiff bodies. Online classes, breathwork audio, and mobility programs.", rating: 4.8, subscribers: 1410, tiers: [
    { id: "t1", name: "Daily Flow", price: 12, perks: ["Daily 20-min class"] },
    { id: "t2", name: "Studio", price: 29, perks: ["Live weekly class", "DMs"] },
  ]},
  { id: "c6", handle: "lucas", name: "Lucas Wei", niche: "Business", headline: "Solo founder coach", bio: "Helping indie hackers go from side-project to $10k MRR.", rating: 4.9, subscribers: 540, tiers: [
    { id: "t1", name: "Newsletter", price: 18, perks: ["Weekly teardown"] },
    { id: "t2", name: "Founder", price: 99, perks: ["DM access", "Monthly call"] },
  ]},
];

export const posts: Post[] = [
  { id: "p1", coachId: "c1", body: "Day 1 of the new mesocycle — RPE 7 across the board. Form notes inside.", createdAt: "2h", requiredTier: "t2", mediaType: "video", likes: 142, comments: 18 },
  { id: "p2", coachId: "c2", body: "The 2-minute morning audit. Free this week — try it tomorrow.", createdAt: "5h", requiredTier: null, mediaType: "text", likes: 89, comments: 12 },
  { id: "p3", coachId: "c3", body: "Long run pacing for marathon block week 4. Charts attached.", createdAt: "1d", requiredTier: "t1", mediaType: "image", likes: 220, comments: 31 },
  { id: "p4", coachId: "c4", body: "Cutting myth: you don't need to drop carbs. Here's why.", createdAt: "1d", requiredTier: null, mediaType: "text", likes: 311, comments: 47 },
  { id: "p5", coachId: "c5", body: "20-minute hip mobility flow — recorded this morning.", createdAt: "2d", requiredTier: "t1", mediaType: "video", likes: 198, comments: 22 },
  { id: "p6", coachId: "c1", body: "Subscriber Q&A — full programming breakdown for Mei (VIP).", createdAt: "3d", requiredTier: "t3", mediaType: "pdf", likes: 64, comments: 9 },
];

export const conversations: Conversation[] = [
  { id: "k1", coachId: "c1", lastMessage: "Form looked great on the last set — let's add 2.5kg next week.", lastAt: "12m", unread: 2 },
  { id: "k2", coachId: "c3", lastMessage: "Solid long run! How were the legs at km 28?", lastAt: "3h", unread: 0 },
  { id: "k3", coachId: "c5", lastMessage: "Try the breath ladder before bed tonight.", lastAt: "1d", unread: 1 },
];

export const messagesByConv: Record<string, Message[]> = {
  k1: [
    { id: "m1", conversationId: "k1", fromCoach: false, body: "Hit 5x5 @ 100kg today, felt smooth.", at: "08:14" },
    { id: "m2", conversationId: "k1", fromCoach: true, body: "Nice work. Bar speed on the 4th rep?", at: "08:22" },
    { id: "m3", conversationId: "k1", fromCoach: false, body: "Slowed a touch but no grind.", at: "08:23" },
    { id: "m4", conversationId: "k1", fromCoach: true, body: "Form looked great on the last set — let's add 2.5kg next week.", at: "08:30" },
  ],
  k2: [{ id: "m5", conversationId: "k2", fromCoach: true, body: "Solid long run! How were the legs at km 28?", at: "Yesterday" }],
  k3: [{ id: "m6", conversationId: "k3", fromCoach: true, body: "Try the breath ladder before bed tonight.", at: "Mon" }],
};

export const bookings: Booking[] = [
  { id: "b1", coachId: "c1", startsAt: "Thu 14:00", durationMin: 45, price: 75, status: "upcoming" },
  { id: "b2", coachId: "c3", startsAt: "Sat 09:30", durationMin: 30, price: 50, status: "upcoming" },
  { id: "b3", coachId: "c2", startsAt: "Last Mon 18:00", durationMin: 60, price: 90, status: "completed" },
];

export const findCoach = (idOrHandle: string) =>
  coaches.find((c) => c.id === idOrHandle || c.handle === idOrHandle);

// ----- Challenges / Cohorts -----
export interface ChallengeLesson {
  day: number;
  title: string;
  type: "text" | "video" | "audio" | "assignment";
  preview?: string;
}

export interface Challenge {
  id: string;
  coachId: string;
  title: string;
  description: string;
  price: number;
  durationDays: number;
  enrolled: number;
  maxParticipants: number;
  startsIn: string;
  status: "open" | "active" | "completed";
  curriculum: ChallengeLesson[];
}

export const challenges: Challenge[] = [
  {
    id: "ch1",
    coachId: "c1",
    title: "30-Day Strength Reset",
    description: "Rebuild your squat, bench, and deadlift base with daily programming and weekly check-ins.",
    price: 79,
    durationDays: 30,
    enrolled: 142,
    maxParticipants: 200,
    startsIn: "Starts Mon",
    status: "open",
    curriculum: [
      { day: 1, title: "Movement assessment", type: "video", preview: "Bodyweight screen — record and submit." },
      { day: 2, title: "Squat technique primer", type: "video" },
      { day: 3, title: "Bench press setup", type: "video" },
      { day: 4, title: "Recovery & sleep audit", type: "assignment" },
      { day: 5, title: "Week 1 wrap", type: "text" },
    ],
  },
  {
    id: "ch2",
    coachId: "c2",
    title: "21-Day Habit Foundation",
    description: "Install three durable daily habits without burnout. Daily 5-minute audio + assignment.",
    price: 49,
    durationDays: 21,
    enrolled: 318,
    maxParticipants: 500,
    startsIn: "Starts in 2 days",
    status: "open",
    curriculum: [
      { day: 1, title: "Pick your three", type: "audio", preview: "How to choose three habits that compound." },
      { day: 2, title: "Habit stacking", type: "audio" },
      { day: 3, title: "Friction audit", type: "assignment" },
    ],
  },
  {
    id: "ch3",
    coachId: "c3",
    title: "First Marathon in 16 Weeks",
    description: "Beginner-friendly marathon block. Weekly long run, two key sessions, and recovery guidance.",
    price: 129,
    durationDays: 112,
    enrolled: 86,
    maxParticipants: 120,
    startsIn: "Starts Apr 28",
    status: "open",
    curriculum: [
      { day: 1, title: "Base run", type: "text", preview: "Easy 30 min — conversational pace." },
      { day: 2, title: "Mobility flow", type: "video" },
      { day: 3, title: "Tempo intro", type: "text" },
    ],
  },
];

// ----- Community posts -----
export interface CommunityPost {
  id: string;
  coachId: string;
  authorName: string;
  authorIsCoach: boolean;
  body: string;
  createdAt: string;
  isAnnouncement: boolean;
  replies: number;
}

export const communityPosts: CommunityPost[] = [
  { id: "cp1", coachId: "c1", authorName: "Maya Okafor", authorIsCoach: true, body: "Reminder: form-check window opens Friday. Drop your video in this thread.", createdAt: "1h", isAnnouncement: true, replies: 8 },
  { id: "cp2", coachId: "c1", authorName: "Sam", authorIsCoach: false, body: "First time hitting a 1.5x bodyweight squat — appreciate the cues this month.", createdAt: "3h", isAnnouncement: false, replies: 3 },
  { id: "cp3", coachId: "c2", authorName: "Theo Lindberg", authorIsCoach: true, body: "New audio Q&A is live. Send questions for next week below.", createdAt: "5h", isAnnouncement: true, replies: 12 },
];

// ----- Subscribers / CRM -----
export interface SubscriberRow {
  id: string;
  name: string;
  tier: string;
  joined: string;
  lastActive: string;
  engagement: "high" | "medium" | "low";
  tags: string[];
}

export const subscribers: SubscriberRow[] = [
  { id: "s1", name: "Mei Tanaka", tier: "VIP", joined: "Jan 12", lastActive: "5m", engagement: "high", tags: ["high-value"] },
  { id: "s2", name: "Budi Santoso", tier: "Pro", joined: "Feb 03", lastActive: "1h", engagement: "high", tags: [] },
  { id: "s3", name: "Aisyah Rahmawati", tier: "Pro", joined: "Feb 19", lastActive: "1d", engagement: "medium", tags: ["new"] },
  { id: "s4", name: "Carlos Mendoza", tier: "Basic", joined: "Mar 02", lastActive: "8d", engagement: "low", tags: ["at-risk"] },
  { id: "s5", name: "Rina Putri", tier: "Pro", joined: "Mar 14", lastActive: "2h", engagement: "high", tags: [] },
  { id: "s6", name: "Jonas Weber", tier: "Basic", joined: "Mar 21", lastActive: "12d", engagement: "low", tags: ["at-risk"] },
];

// ----- Payouts -----
export interface PayoutRow {
  id: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  date: string;
}

export const payouts: PayoutRow[] = [
  { id: "po1", amount: 1240, status: "completed", date: "Apr 01" },
  { id: "po2", amount: 1380, status: "completed", date: "Mar 01" },
  { id: "po3", amount: 1170, status: "completed", date: "Feb 01" },
];

// ----- Daily stats (for analytics charts) -----
export interface DailyStat {
  date: string;
  revenue: number;
  newSubs: number;
  churned: number;
  views: number;
}

export const dailyStats: DailyStat[] = Array.from({ length: 30 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const base = 35 + Math.round(Math.sin(i / 3) * 12) + Math.round(Math.random() * 8);
  return {
    date: day,
    revenue: base * 24,
    newSubs: Math.max(0, Math.round(base / 12)),
    churned: Math.max(0, Math.round((base / 30) - 1)),
    views: base * 18 + Math.round(Math.random() * 60),
  };
});

// ----- Referrals -----
export interface ReferralRow {
  id: string;
  coachName: string;
  joinedAt: string;
  earnedToDate: number;
}

export const referrals: ReferralRow[] = [
  { id: "r1", coachName: "Theo Lindberg", joinedAt: "Feb 02", earnedToDate: 184 },
  { id: "r2", coachName: "Sara Halim", joinedAt: "Mar 18", earnedToDate: 92 },
];

// ----- Billing / payments (mentee side) -----
export interface PaymentRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "paid" | "failed" | "refunded" | "pending";
  method: "VA" | "GoPay" | "OVO" | "Card";
}

export const payments: PaymentRow[] = [
  { id: "py1", date: "Apr 12", description: "Maya Lestari · Pro · Renewal",     amount: 19, status: "paid", method: "GoPay" },
  { id: "py2", date: "Mar 12", description: "Maya Lestari · Pro · Renewal",     amount: 19, status: "paid", method: "GoPay" },
  { id: "py3", date: "Feb 28", description: "Theo Lindberg · Basic · Renewal",  amount: 24, status: "paid", method: "VA" },
  { id: "py4", date: "Feb 12", description: "Maya Lestari · Pro · Renewal",     amount: 19, status: "paid", method: "GoPay" },
  { id: "py5", date: "Jan 28", description: "Theo Lindberg · Basic · New",      amount: 24, status: "paid", method: "VA" },
  { id: "py6", date: "Jan 12", description: "Maya Lestari · Pro · New",         amount: 19, status: "paid", method: "Card" },
];

export interface PaymentMethod {
  id: string;
  kind: "VA" | "GoPay" | "OVO" | "Card";
  label: string;
  isDefault: boolean;
}

export const paymentMethods: PaymentMethod[] = [
  { id: "pm1", kind: "GoPay", label: "GoPay · 0812-•••-3210", isDefault: true },
  { id: "pm2", kind: "VA",    label: "BCA Virtual Account",    isDefault: false },
  { id: "pm3", kind: "Card",  label: "Visa •••• 4242",         isDefault: false },
];
