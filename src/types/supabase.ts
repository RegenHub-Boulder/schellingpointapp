// Database types for Supabase - generated from migrations

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          invite_code: string | null
          payout_address: string | null
          display_name: string | null
          bio: string | null
          topics: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          invite_code?: string | null
          payout_address?: string | null
          display_name?: string | null
          bio?: string | null
          topics?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          invite_code?: string | null
          payout_address?: string | null
          display_name?: string | null
          bio?: string | null
          topics?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      user_passkeys: {
        Row: {
          id: string
          user_id: string
          pubkey_x: string
          pubkey_y: string
          credential_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pubkey_x: string
          pubkey_y: string
          credential_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pubkey_x?: string
          pubkey_y?: string
          credential_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_passkeys_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
