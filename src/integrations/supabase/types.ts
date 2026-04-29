export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      availability_slots: {
        Row: {
          coach_id: string
          created_at: string
          duration_min: number
          ends_at: string
          id: string
          is_booked: boolean
          price_cents: number
          starts_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          duration_min: number
          ends_at: string
          id?: string
          is_booked?: boolean
          price_cents: number
          starts_at: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          duration_min?: number
          ends_at?: string
          id?: string
          is_booked?: boolean
          price_cents?: number
          starts_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          coach_id: string
          created_at: string
          duration_min: number
          id: string
          meeting_url: string | null
          mentee_id: string
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          price_cents: number
          slot_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id: string | null
          xendit_invoice_id: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          duration_min: number
          id?: string
          meeting_url?: string | null
          mentee_id: string
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          price_cents: number
          slot_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          xendit_invoice_id?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          meeting_url?: string | null
          mentee_id?: string
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          price_cents?: number
          slot_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          xendit_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: true
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_billing: {
        Row: {
          stripe_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          stripe_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_profiles: {
        Row: {
          created_at: string
          is_published: boolean
          niche: Database["public"]["Enums"]["niche"]
          rating: number
          subscriber_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_published?: boolean
          niche?: Database["public"]["Enums"]["niche"]
          rating?: number
          subscriber_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_published?: boolean
          niche?: Database["public"]["Enums"]["niche"]
          rating?: number
          subscriber_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          last_message_at: string
          mentee_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          mentee_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          mentee_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_path: string | null
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_path?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_path?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          duration_sec: number | null
          height: number | null
          id: string
          mime_type: string | null
          post_id: string
          sort_order: number
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          post_id: string
          sort_order?: number
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          post_id?: string
          sort_order?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          body: string
          coach_id: string
          comment_count: number
          created_at: string
          id: string
          like_count: number
          media_type: Database["public"]["Enums"]["media_type"]
          required_tier_id: string | null
        }
        Insert: {
          body: string
          coach_id: string
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          media_type?: Database["public"]["Enums"]["media_type"]
          required_tier_id?: string | null
        }
        Update: {
          body?: string
          coach_id?: string
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          media_type?: Database["public"]["Enums"]["media_type"]
          required_tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_required_tier_id_fkey"
            columns: ["required_tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhook_events: {
        Row: {
          event_type: string | null
          id: string
          processed_at: string
          provider: string
        }
        Insert: {
          event_type?: string | null
          id: string
          processed_at?: string
          provider: string
        }
        Update: {
          event_type?: string | null
          id?: string
          processed_at?: string
          provider?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          handle: string
          headline: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          handle: string
          headline?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          headline?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          perks: string[]
          price_cents: number
          price_idr_cents: number | null
          sort_order: number
          stripe_price_id: string | null
          xendit_plan_id: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          perks?: string[]
          price_cents: number
          price_idr_cents?: number | null
          sort_order?: number
          stripe_price_id?: string | null
          xendit_plan_id?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          perks?: string[]
          price_cents?: number
          price_idr_cents?: number | null
          sort_order?: number
          stripe_price_id?: string | null
          xendit_plan_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          coach_id: string
          created_at: string
          current_period_end: string | null
          id: string
          mentee_id: string
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id: string | null
          tier_id: string
          updated_at: string
          xendit_customer_id: string | null
          xendit_recurring_plan_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean
          coach_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          mentee_id: string
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          tier_id: string
          updated_at?: string
          xendit_customer_id?: string | null
          xendit_recurring_plan_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          coach_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          mentee_id?: string
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          tier_id?: string
          updated_at?: string
          xendit_customer_id?: string | null
          xendit_recurring_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          id: string
          coach_id: string
          title: string
          description: string | null
          cover_image_url: string | null
          price_cents: number
          duration_days: number
          max_participants: number | null
          enrollment_deadline: string | null
          starts_at: string | null
          ends_at: string | null
          status: Database["public"]["Enums"]["challenge_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          title: string
          description?: string | null
          cover_image_url?: string | null
          price_cents: number
          duration_days: number
          max_participants?: number | null
          enrollment_deadline?: string | null
          starts_at?: string | null
          ends_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          title?: string
          description?: string | null
          cover_image_url?: string | null
          price_cents?: number
          duration_days?: number
          max_participants?: number | null
          enrollment_deadline?: string | null
          starts_at?: string | null
          ends_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      challenge_curriculum: {
        Row: {
          id: string
          challenge_id: string
          day_number: number
          title: string
          body: string | null
          media_url: string | null
          lesson_type: Database["public"]["Enums"]["challenge_lesson_type"]
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          day_number: number
          title: string
          body?: string | null
          media_url?: string | null
          lesson_type?: Database["public"]["Enums"]["challenge_lesson_type"]
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          day_number?: number
          title?: string
          body?: string | null
          media_url?: string | null
          lesson_type?: Database["public"]["Enums"]["challenge_lesson_type"]
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_curriculum_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          }
        ]
      }
      challenge_enrollments: {
        Row: {
          id: string
          challenge_id: string
          mentee_id: string
          enrolled_at: string
          payment_id: string | null
        }
        Insert: {
          id?: string
          challenge_id: string
          mentee_id: string
          enrolled_at?: string
          payment_id?: string | null
        }
        Update: {
          id?: string
          challenge_id?: string
          mentee_id?: string
          enrolled_at?: string
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_enrollments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          }
        ]
      }
      community_posts: {
        Row: {
          id: string
          coach_id: string
          user_id: string
          parent_id: string | null
          body: string
          is_announcement: boolean
          created_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          user_id: string
          parent_id?: string | null
          body: string
          is_announcement?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          user_id?: string
          parent_id?: string | null
          body?: string
          is_announcement?: boolean
          created_at?: string
        }
        Relationships: []
      }
      coach_payout_accounts: {
        Row: {
          coach_id: string
          provider: string
          bank_name: string | null
          bank_account_number: string | null
          bank_account_holder: string | null
          ewallet_kind: string | null
          ewallet_phone: string | null
          payout_schedule: string
          min_payout_cents: number
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          provider?: string
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_holder?: string | null
          ewallet_kind?: string | null
          ewallet_phone?: string | null
          payout_schedule?: string
          min_payout_cents?: number
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          provider?: string
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_holder?: string | null
          ewallet_kind?: string | null
          ewallet_phone?: string | null
          payout_schedule?: string
          min_payout_cents?: number
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          id: string
          coach_id: string
          amount_cents: number
          status: Database["public"]["Enums"]["payout_status"]
          xendit_payout_id: string | null
          payout_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          amount_cents: number
          status?: Database["public"]["Enums"]["payout_status"]
          xendit_payout_id?: string | null
          payout_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          amount_cents?: number
          status?: Database["public"]["Enums"]["payout_status"]
          xendit_payout_id?: string | null
          payout_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      coach_daily_stats: {
        Row: {
          id: string
          coach_id: string
          stat_date: string
          revenue_cents: number
          new_subscribers: number
          churned_subscribers: number
          content_views: number
          messages_received: number
        }
        Insert: {
          id?: string
          coach_id: string
          stat_date: string
          revenue_cents?: number
          new_subscribers?: number
          churned_subscribers?: number
          content_views?: number
          messages_received?: number
        }
        Update: {
          id?: string
          coach_id?: string
          stat_date?: string
          revenue_cents?: number
          new_subscribers?: number
          churned_subscribers?: number
          content_views?: number
          messages_received?: number
        }
        Relationships: []
      }
      subscriber_tags: {
        Row: {
          id: string
          coach_id: string
          mentee_id: string
          tag: string
          created_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          mentee_id: string
          tag: string
          created_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          mentee_id?: string
          tag?: string
          created_at?: string
        }
        Relationships: []
      }
      subscriber_notes: {
        Row: {
          id: string
          coach_id: string
          mentee_id: string
          note: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          mentee_id: string
          note: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          mentee_id?: string
          note?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_active_subscription: {
        Args: { _coach: string; _mentee: string }
        Returns: boolean
      }
      has_active_subscription_to_tier: {
        Args: { _mentee: string; _tier: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "mentee"
      booking_status: "pending" | "confirmed" | "completed" | "cancelled"
      challenge_status: "draft" | "open" | "active" | "completed" | "cancelled"
      challenge_lesson_type: "text" | "video" | "audio" | "assignment"
      payout_status: "pending" | "processing" | "completed" | "failed"
      media_type: "text" | "image" | "video" | "pdf"
      niche:
        | "Strength"
        | "Mindset"
        | "Endurance"
        | "Nutrition"
        | "Yoga"
        | "Business"
        | "Other"
      payment_provider: "stripe" | "xendit"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "incomplete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coach", "mentee"],
      booking_status: ["pending", "confirmed", "completed", "cancelled"],
      media_type: ["text", "image", "video", "pdf"],
      niche: [
        "Strength",
        "Mindset",
        "Endurance",
        "Nutrition",
        "Yoga",
        "Business",
        "Other",
      ],
      payment_provider: ["stripe", "xendit"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
      ],
    },
  },
} as const
