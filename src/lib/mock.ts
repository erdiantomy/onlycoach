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
