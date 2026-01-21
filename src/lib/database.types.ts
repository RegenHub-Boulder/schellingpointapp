export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attestations: {
        Row: {
          attestation_type: string
          attestation_uid: string
          attester_address: string
          block_number: number
          created_at: string | null
          data: Json
          event_id: string | null
          id: string
          indexed_at: string | null
          recipient_address: string | null
          schema_uid: string
          session_id: string | null
          tx_hash: string
        }
        Insert: {
          attestation_type: string
          attestation_uid: string
          attester_address: string
          block_number: number
          created_at?: string | null
          data: Json
          event_id?: string | null
          id?: string
          indexed_at?: string | null
          recipient_address?: string | null
          schema_uid: string
          session_id?: string | null
          tx_hash: string
        }
        Update: {
          attestation_type?: string
          attestation_uid?: string
          attester_address?: string
          block_number?: number
          created_at?: string | null
          data?: Json
          event_id?: string | null
          id?: string
          indexed_at?: string | null
          recipient_address?: string | null
          schema_uid?: string
          session_id?: string | null
          tx_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "attestations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_items: {
        Row: {
          amount: number
          created_at: string | null
          distribution_id: string | null
          id: string
          percentage: number
          qf_score: number
          recipient_address: string
          session_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          distribution_id?: string | null
          id?: string
          percentage: number
          qf_score: number
          recipient_address: string
          session_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          distribution_id?: string | null
          id?: string
          percentage?: number
          qf_score?: number
          recipient_address?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_items_distribution_id_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      distributions: {
        Row: {
          created_at: string | null
          distributable_amount: number
          event_id: string | null
          executed_at: string | null
          id: string
          platform_fee: number
          status: string | null
          total_pool: number
          tx_hash: string | null
        }
        Insert: {
          created_at?: string | null
          distributable_amount: number
          event_id?: string | null
          executed_at?: string | null
          id?: string
          platform_fee: number
          status?: string | null
          total_pool: number
          tx_hash?: string | null
        }
        Update: {
          created_at?: string | null
          distributable_amount?: number
          event_id?: string | null
          executed_at?: string | null
          id?: string
          platform_fee?: number
          status?: string | null
          total_pool?: number
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_access: {
        Row: {
          access_granted: boolean | null
          burner_card_id: string | null
          checked_in: boolean | null
          checked_in_at: string | null
          created_at: string | null
          email: string | null
          event_id: string | null
          id: string
          is_admin: boolean | null
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          access_granted?: boolean | null
          burner_card_id?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          is_admin?: boolean | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          access_granted?: boolean | null
          burner_card_id?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          is_admin?: boolean | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_access_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          access_mode: string
          attendance_vote_credits: number | null
          banner_image_url: string | null
          created_at: string | null
          description: string | null
          distribution_executed: boolean | null
          end_date: string
          id: string
          location: string | null
          name: string
          nft_chain_id: number | null
          nft_contract_address: string | null
          payment_token_address: string | null
          payment_token_symbol: string | null
          platform_fee_percent: number | null
          pre_vote_credits: number | null
          pre_vote_deadline: string | null
          proposal_deadline: string | null
          schedule_locked: boolean | null
          schedule_published: boolean | null
          slug: string
          start_date: string
          total_budget_pool: number | null
          treasury_wallet_address: string | null
          updated_at: string | null
          voting_opens_at: string | null
        }
        Insert: {
          access_mode?: string
          attendance_vote_credits?: number | null
          banner_image_url?: string | null
          created_at?: string | null
          description?: string | null
          distribution_executed?: boolean | null
          end_date: string
          id?: string
          location?: string | null
          name: string
          nft_chain_id?: number | null
          nft_contract_address?: string | null
          payment_token_address?: string | null
          payment_token_symbol?: string | null
          platform_fee_percent?: number | null
          pre_vote_credits?: number | null
          pre_vote_deadline?: string | null
          proposal_deadline?: string | null
          schedule_locked?: boolean | null
          schedule_published?: boolean | null
          slug: string
          start_date: string
          total_budget_pool?: number | null
          treasury_wallet_address?: string | null
          updated_at?: string | null
          voting_opens_at?: string | null
        }
        Update: {
          access_mode?: string
          attendance_vote_credits?: number | null
          banner_image_url?: string | null
          created_at?: string | null
          description?: string | null
          distribution_executed?: boolean | null
          end_date?: string
          id?: string
          location?: string | null
          name?: string
          nft_chain_id?: number | null
          nft_contract_address?: string | null
          payment_token_address?: string | null
          payment_token_symbol?: string | null
          platform_fee_percent?: number | null
          pre_vote_credits?: number | null
          pre_vote_deadline?: string | null
          proposal_deadline?: string | null
          schedule_locked?: boolean | null
          schedule_published?: boolean | null
          slug?: string
          start_date?: string
          total_budget_pool?: number | null
          treasury_wallet_address?: string | null
          updated_at?: string | null
          voting_opens_at?: string | null
        }
        Relationships: []
      }
      merger_requests: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          message: string | null
          requested_by_user_id: string | null
          requesting_session_id: string | null
          responded_at: string | null
          response_message: string | null
          status: string | null
          target_session_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          message?: string | null
          requested_by_user_id?: string | null
          requesting_session_id?: string | null
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          target_session_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          message?: string | null
          requested_by_user_id?: string | null
          requesting_session_id?: string | null
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          target_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merger_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merger_requests_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merger_requests_requesting_session_id_fkey"
            columns: ["requesting_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merger_requests_target_session_id_fkey"
            columns: ["target_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_attendance_stats: {
        Row: {
          id: string
          last_updated: string | null
          qf_score: number | null
          session_id: string | null
          total_credits_spent: number | null
          total_voters: number | null
          total_votes: number | null
          vote_distribution: Json | null
        }
        Insert: {
          id?: string
          last_updated?: string | null
          qf_score?: number | null
          session_id?: string | null
          total_credits_spent?: number | null
          total_voters?: number | null
          total_votes?: number | null
          vote_distribution?: Json | null
        }
        Update: {
          id?: string
          last_updated?: string | null
          qf_score?: number | null
          session_id?: string | null
          total_credits_spent?: number | null
          total_voters?: number | null
          total_votes?: number | null
          vote_distribution?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "session_attendance_stats_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_hosts: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          session_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          session_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          session_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_hosts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_hosts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_pre_vote_stats: {
        Row: {
          id: string
          last_updated: string | null
          session_id: string | null
          total_credits_spent: number | null
          total_voters: number | null
          total_votes: number | null
          vote_distribution: Json | null
        }
        Insert: {
          id?: string
          last_updated?: string | null
          session_id?: string | null
          total_credits_spent?: number | null
          total_voters?: number | null
          total_votes?: number | null
          vote_distribution?: Json | null
        }
        Update: {
          id?: string
          last_updated?: string | null
          session_id?: string | null
          total_credits_spent?: number | null
          total_voters?: number | null
          total_votes?: number | null
          vote_distribution?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "session_pre_vote_stats_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          description: string
          duration: number
          event_id: string | null
          format: string
          id: string
          is_locked: boolean | null
          max_participants: number | null
          merged_into_session_id: string | null
          rejection_reason: string | null
          status: string
          technical_requirements: string[] | null
          time_slot_id: string | null
          title: string
          topic_tags: string[] | null
          track: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          duration: number
          event_id?: string | null
          format: string
          id?: string
          is_locked?: boolean | null
          max_participants?: number | null
          merged_into_session_id?: string | null
          rejection_reason?: string | null
          status?: string
          technical_requirements?: string[] | null
          time_slot_id?: string | null
          title: string
          topic_tags?: string[] | null
          track?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          duration?: number
          event_id?: string | null
          format?: string
          id?: string
          is_locked?: boolean | null
          max_participants?: number | null
          merged_into_session_id?: string | null
          rejection_reason?: string | null
          status?: string
          technical_requirements?: string[] | null
          time_slot_id?: string | null
          title?: string
          topic_tags?: string[] | null
          track?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_merged_into_session_id_fkey"
            columns: ["merged_into_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          created_at: string | null
          display_order: number | null
          end_time: string
          event_id: string | null
          id: string
          is_available: boolean | null
          label: string | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          end_time: string
          event_id?: string | null
          id?: string
          is_available?: boolean | null
          label?: string | null
          start_time: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          end_time?: string
          event_id?: string | null
          id?: string
          is_available?: boolean | null
          label?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attendance_balance: {
        Row: {
          credits_remaining: number | null
          credits_spent: number | null
          event_id: string | null
          id: string
          last_updated: string | null
          sessions_voted_count: number | null
          user_id: string | null
        }
        Insert: {
          credits_remaining?: number | null
          credits_spent?: number | null
          event_id?: string | null
          id?: string
          last_updated?: string | null
          sessions_voted_count?: number | null
          user_id?: string | null
        }
        Update: {
          credits_remaining?: number | null
          credits_spent?: number | null
          event_id?: string | null
          id?: string
          last_updated?: string | null
          sessions_voted_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_attendance_balance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_attendance_balance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pre_vote_balance: {
        Row: {
          credits_remaining: number | null
          credits_spent: number | null
          event_id: string | null
          id: string
          last_updated: string | null
          user_id: string | null
        }
        Insert: {
          credits_remaining?: number | null
          credits_spent?: number | null
          event_id?: string | null
          id?: string
          last_updated?: string | null
          user_id?: string | null
        }
        Update: {
          credits_remaining?: number | null
          credits_spent?: number | null
          event_id?: string | null
          id?: string
          last_updated?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_pre_vote_balance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pre_vote_balance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string
          ens_address: string | null
          id: string
          payout_address: string | null
          smart_wallet_address: string
          topics: string[] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          ens_address?: string | null
          id?: string
          payout_address?: string | null
          smart_wallet_address: string
          topics?: string[] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          ens_address?: string | null
          id?: string
          payout_address?: string | null
          smart_wallet_address?: string
          topics?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      venues: {
        Row: {
          capacity: number
          created_at: string | null
          description: string | null
          display_order: number | null
          event_id: string | null
          features: string[] | null
          id: string
          name: string
        }
        Insert: {
          capacity: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          event_id?: string | null
          features?: string[] | null
          id?: string
          name: string
        }
        Update: {
          capacity?: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          event_id?: string | null
          features?: string[] | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      voter_overlap: {
        Row: {
          event_id: string | null
          id: string
          last_calculated: string | null
          overlap_percentage: number | null
          session_a_id: string | null
          session_b_id: string | null
          shared_voters: number | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          last_calculated?: string | null
          overlap_percentage?: number | null
          session_a_id?: string | null
          session_b_id?: string | null
          shared_voters?: number | null
        }
        Update: {
          event_id?: string | null
          id?: string
          last_calculated?: string | null
          overlap_percentage?: number | null
          session_a_id?: string | null
          session_b_id?: string | null
          shared_voters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "voter_overlap_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voter_overlap_session_a_id_fkey"
            columns: ["session_a_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voter_overlap_session_b_id_fkey"
            columns: ["session_b_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_event_access: {
        Args: { event_uuid: string }
        Returns: boolean
      }
      is_event_admin: {
        Args: { event_uuid: string }
        Returns: boolean
      }
      is_session_host: {
        Args: { session_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

