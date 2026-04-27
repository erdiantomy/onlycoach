/**
 * Hand-written types for tables added in
 * supabase/migrations/20260426150000_challenges_community_payouts.sql
 *
 * The auto-generated types.ts comes from `supabase gen types typescript`
 * and is regenerated against the live project — re-run that command
 * once the new migration is applied to merge these into the canonical
 * Database type. Until then, importing from here keeps the app strongly
 * typed without us having to hand-patch the generated file.
 */

export type ChallengeStatus = "draft" | "open" | "active" | "completed" | "cancelled";
export type ChallengeLessonType = "text" | "video" | "audio" | "assignment";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";

export interface Challenge {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  price_cents: number;
  duration_days: number;
  max_participants: number | null;
  enrollment_deadline: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: ChallengeStatus;
  created_at: string;
  updated_at: string;
}

export interface ChallengeCurriculum {
  id: string;
  challenge_id: string;
  day_number: number;
  title: string;
  body: string | null;
  media_url: string | null;
  lesson_type: ChallengeLessonType;
  sort_order: number;
  created_at: string;
}

export interface ChallengeEnrollment {
  id: string;
  challenge_id: string;
  mentee_id: string;
  enrolled_at: string;
  payment_id: string | null;
}

export interface CommunityPost {
  id: string;
  coach_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  is_announcement: boolean;
  created_at: string;
}

export interface CoachPayoutAccount {
  coach_id: string;
  provider: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  ewallet_kind: string | null;
  ewallet_phone: string | null;
  payout_schedule: "weekly" | "biweekly" | "monthly";
  min_payout_cents: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  coach_id: string;
  amount_cents: number;
  status: PayoutStatus;
  xendit_payout_id: string | null;
  payout_at: string | null;
  created_at: string;
}

export interface CoachDailyStats {
  id: string;
  coach_id: string;
  stat_date: string;
  revenue_cents: number;
  new_subscribers: number;
  churned_subscribers: number;
  content_views: number;
  messages_received: number;
}

export interface CoachReferral {
  id: string;
  referrer_id: string;
  referred_id: string;
  commission_rate: number;
  total_earned_cents: number;
  created_at: string;
}

export interface SubscriberTag {
  id: string;
  coach_id: string;
  mentee_id: string;
  tag: string;
  created_at: string;
}

export interface SubscriberNote {
  id: string;
  coach_id: string;
  mentee_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}
