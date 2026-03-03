// Bu dosya Supabase CLI ile otomatik üretilebilir:
// npm run db:types
// Manuel olarak projenizin şemasına göre güncelleyin.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string
          display_name: string
          avatar_url: string | null
          bio: string | null
          location_point: unknown | null // PostGIS point
          verified_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone: string
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          location_point?: unknown | null
          verified_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          avatar_url?: string | null
          bio?: string | null
          location_point?: unknown | null
          verified_at?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }

      activity_cards: {
        Row: {
          id: string
          creator_id: string
          category: ActivityCategory
          title: string
          description: string | null
          location_point: unknown // PostGIS point
          location_name: string
          max_participants: number
          current_participants: number
          expires_at: string
          status: CardStatus
          created_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          category: ActivityCategory
          title: string
          description?: string | null
          location_point: unknown
          location_name: string
          max_participants?: number
          expires_at: string
          status?: CardStatus
          created_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          max_participants?: number
          expires_at?: string
          status?: CardStatus
        }
      }

      card_joins: {
        Row: {
          id: string
          card_id: string
          user_id: string
          status: JoinStatus
          message: string | null
          joined_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          card_id: string
          user_id: string
          status?: JoinStatus
          message?: string | null
          joined_at?: string
        }
        Update: {
          status?: JoinStatus
          responded_at?: string
        }
      }

      neighborhoods: {
        Row: {
          id: string
          name: string
          city: string
          district: string
          description: string | null
          member_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          city: string
          district: string
          description?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
        }
      }

      neighborhood_members: {
        Row: {
          neighborhood_id: string
          user_id: string
          role: NeighborhoodRole
          joined_at: string
        }
        Insert: {
          neighborhood_id: string
          user_id: string
          role?: NeighborhoodRole
          joined_at?: string
        }
        Update: {
          role?: NeighborhoodRole
        }
      }

      skill_swaps: {
        Row: {
          id: string
          offerer_id: string
          skill_offered: string
          skill_wanted: string
          description: string | null
          status: SkillSwapStatus
          matched_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          offerer_id: string
          skill_offered: string
          skill_wanted: string
          description?: string | null
          status?: SkillSwapStatus
          created_at?: string
        }
        Update: {
          status?: SkillSwapStatus
          matched_user_id?: string | null
        }
      }

      venues: {
        Row: {
          id: string
          name: string
          description: string | null
          location_point: unknown
          address: string
          category: VenueCategory
          commission_rate: number
          partner_tier: PartnerTier
          is_active: boolean
          partner_since: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          location_point: unknown
          address: string
          category: VenueCategory
          commission_rate?: number
          partner_tier?: PartnerTier
          is_active?: boolean
          partner_since?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          commission_rate?: number
          partner_tier?: PartnerTier
          is_active?: boolean
        }
      }

      safety_logs: {
        Row: {
          id: string
          user_id: string
          card_id: string
          safe_ping_at: string | null
          emergency_contact_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_id: string
          safe_ping_at?: string | null
          emergency_contact_id?: string | null
          created_at?: string
        }
        Update: {
          safe_ping_at?: string
        }
      }

      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_user_id: string
          reason: ReportReason
          description: string | null
          status: ReportStatus
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_user_id: string
          reason: ReportReason
          description?: string | null
          status?: ReportStatus
          created_at?: string
        }
        Update: {
          status?: ReportStatus
        }
      }
    }

    Views: {
      nearby_cards: {
        Row: {
          id: string
          creator_id: string
          category: ActivityCategory
          title: string
          location_name: string
          expires_at: string
          status: CardStatus
          current_participants: number
          max_participants: number
          distance_meters: number | null
        }
      }
    }

    Functions: {
      get_nearby_cards: {
        Args: {
          lat: number
          lng: number
          radius_meters: number
        }
        Returns: Database['public']['Views']['nearby_cards']['Row'][]
      }
    }
  }
}

// ─── Enum Tipleri ────────────────────────────────────────────────────────────

export type ActivityCategory =
  | 'kahve'
  | 'spor'
  | 'muzik'
  | 'kitap'
  | 'oyun'
  | 'yuruyus'
  | 'sinema'
  | 'yemek'
  | 'sanat'
  | 'dil'
  | 'diger'

export type CardStatus = 'active' | 'expired' | 'cancelled' | 'full'
export type JoinStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'
export type NeighborhoodRole = 'member' | 'moderator' | 'admin'
export type SkillSwapStatus = 'open' | 'matched' | 'completed' | 'cancelled'
export type VenueCategory = 'kafe' | 'restoran' | 'spor' | 'kultur' | 'etkinlik' | 'diger'
export type PartnerTier = 'bronz' | 'gumus' | 'altin'
export type ReportReason = 'spam' | 'taciz' | 'sahte_profil' | 'uygunsuz_icerik' | 'diger'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'

// ─── Yardımcı Tipler ─────────────────────────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Sık kullanılan tip kısayolları
export type User = Tables<'users'>
export type ActivityCard = Tables<'activity_cards'>
export type CardJoin = Tables<'card_joins'>
export type Neighborhood = Tables<'neighborhoods'>
export type SkillSwap = Tables<'skill_swaps'>
export type Venue = Tables<'venues'>
