import type { TypedSupabaseClient } from './client'
import type {
  InsertDto,
  UpdateDto,
  ActivityCategory,
} from './database.types'

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const authQueries = {
  /** Telefon numarasına OTP gönder */
  signInWithPhone: (supabase: TypedSupabaseClient, phone: string) =>
    supabase.auth.signInWithOtp({ phone }),

  /** OTP kodunu doğrula */
  verifyOtp: (supabase: TypedSupabaseClient, phone: string, token: string) =>
    supabase.auth.verifyOtp({ phone, token, type: 'sms' }),

  /** Oturumu kapat */
  signOut: (supabase: TypedSupabaseClient) =>
    supabase.auth.signOut(),

  /** Mevcut oturumu getir */
  getSession: (supabase: TypedSupabaseClient) =>
    supabase.auth.getSession(),

  /** Oturum değişikliklerini dinle */
  onAuthStateChange: (
    supabase: TypedSupabaseClient,
    callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
  ) => supabase.auth.onAuthStateChange(callback),
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export const userQueries = {
  /** Profili getir */
  getProfile: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single(),

  /** Profil oluştur */
  createProfile: (supabase: TypedSupabaseClient, data: InsertDto<'users'>) =>
    supabase
      .from('users')
      .insert(data)
      .select()
      .single(),

  /** Profil güncelle */
  updateProfile: (
    supabase: TypedSupabaseClient,
    userId: string,
    data: UpdateDto<'users'>
  ) =>
    supabase
      .from('users')
      .update(data)
      .eq('id', userId)
      .select()
      .single(),

  /** Konumu güncelle */
  updateLocation: (
    supabase: TypedSupabaseClient,
    userId: string,
    lat: number,
    lng: number
  ) =>
    supabase.rpc('update_user_location', { user_id: userId, lat, lng }),
}

// ─── ACTIVITY CARDS ───────────────────────────────────────────────────────────

export const cardQueries = {
  /** Yakın çevredeki aktif kartları getir */
  getNearby: (
    supabase: TypedSupabaseClient,
    lat: number,
    lng: number,
    radiusMeters = 5000
  ) =>
    supabase.rpc('get_nearby_cards', {
      lat,
      lng,
      radius_meters: radiusMeters,
    }),

  /** Tek bir kartı detaylarıyla getir */
  getById: (supabase: TypedSupabaseClient, cardId: string) =>
    supabase
      .from('activity_cards')
      .select(`
        *,
        creator:users!creator_id(id, display_name, avatar_url, verified_at),
        card_joins(
          id, user_id, status,
          user:users!user_id(id, display_name, avatar_url)
        )
      `)
      .eq('id', cardId)
      .single(),

  /** Kullanıcının oluşturduğu kartlar */
  getMyCards: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('activity_cards')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false }),

  /** Kullanıcının katıldığı kartlar */
  getJoinedCards: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('card_joins')
      .select(`
        *,
        card:activity_cards(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('joined_at', { ascending: false }),

  /** Yeni aktivite kartı oluştur */
  create: (supabase: TypedSupabaseClient, data: InsertDto<'activity_cards'>) =>
    supabase
      .from('activity_cards')
      .insert(data)
      .select()
      .single(),

  /** Karta katılım isteği gönder */
  requestJoin: (
    supabase: TypedSupabaseClient,
    cardId: string,
    userId: string,
    message?: string
  ) =>
    supabase
      .from('card_joins')
      .insert({ card_id: cardId, user_id: userId, message })
      .select()
      .single(),

  /** Katılım isteğini kabul/red et */
  respondToJoin: (
    supabase: TypedSupabaseClient,
    joinId: string,
    status: 'accepted' | 'declined'
  ) =>
    supabase
      .from('card_joins')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', joinId)
      .select()
      .single(),

  /** Kartı iptal et */
  cancel: (supabase: TypedSupabaseClient, cardId: string) =>
    supabase
      .from('activity_cards')
      .update({ status: 'cancelled' })
      .eq('id', cardId),

  /** Kategoriye göre filtrele */
  getByCategory: (
    supabase: TypedSupabaseClient,
    category: ActivityCategory,
    lat: number,
    lng: number
  ) =>
    supabase.rpc('get_nearby_cards', {
      lat,
      lng,
      radius_meters: 10000,
    }).eq('category', category),

  /** Gerçek zamanlı kart güncellemelerini dinle */
  subscribeToNearby: (
    supabase: TypedSupabaseClient,
    onInsert: (card: unknown) => void,
    onUpdate: (card: unknown) => void
  ) =>
    supabase
      .channel('activity_cards_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_cards' }, payload => onInsert(payload.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activity_cards' }, payload => onUpdate(payload.new))
      .subscribe(),
}

// ─── NEIGHBORHOODS ────────────────────────────────────────────────────────────

export const neighborhoodQueries = {
  /** Şehre göre mahalleleri listele */
  getByCity: (supabase: TypedSupabaseClient, city: string) =>
    supabase
      .from('neighborhoods')
      .select('*')
      .eq('city', city)
      .order('member_count', { ascending: false }),

  /** Kullanıcının üye olduğu mahalleler */
  getMyNeighborhoods: (supabase: TypedSupabaseClient, userId: string) =>
    supabase
      .from('neighborhood_members')
      .select(`
        *,
        neighborhood:neighborhoods(*)
      `)
      .eq('user_id', userId),

  /** Mahalleye üye ol */
  join: (supabase: TypedSupabaseClient, neighborhoodId: string, userId: string) =>
    supabase
      .from('neighborhood_members')
      .insert({ neighborhood_id: neighborhoodId, user_id: userId }),

  /** Mahalleden ayrıl */
  leave: (supabase: TypedSupabaseClient, neighborhoodId: string, userId: string) =>
    supabase
      .from('neighborhood_members')
      .delete()
      .eq('neighborhood_id', neighborhoodId)
      .eq('user_id', userId),
}

// ─── SKILL SWAPS ──────────────────────────────────────────────────────────────

export const skillSwapQueries = {
  /** Açık beceri takas ilanları */
  getOpen: (supabase: TypedSupabaseClient) =>
    supabase
      .from('skill_swaps')
      .select(`
        *,
        offerer:users!offerer_id(id, display_name, avatar_url)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false }),

  /** Yeni ilan oluştur */
  create: (supabase: TypedSupabaseClient, data: InsertDto<'skill_swaps'>) =>
    supabase
      .from('skill_swaps')
      .insert(data)
      .select()
      .single(),

  /** Eşleşme teklif et */
  match: (
    supabase: TypedSupabaseClient,
    swapId: string,
    matchedUserId: string
  ) =>
    supabase
      .from('skill_swaps')
      .update({ status: 'matched', matched_user_id: matchedUserId })
      .eq('id', swapId),
}

// ─── SAFETY ───────────────────────────────────────────────────────────────────

export const safetyQueries = {
  /** Güvenlik kaydı başlat */
  startLog: (
    supabase: TypedSupabaseClient,
    userId: string,
    cardId: string,
    emergencyContactId?: string
  ) =>
    supabase
      .from('safety_logs')
      .insert({ user_id: userId, card_id: cardId, emergency_contact_id: emergencyContactId ?? null })
      .select()
      .single(),

  /** "Güvendeyim" ping gönder */
  sendSafePing: (supabase: TypedSupabaseClient, logId: string) =>
    supabase
      .from('safety_logs')
      .update({ safe_ping_at: new Date().toISOString() })
      .eq('id', logId),
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────

export const reportQueries = {
  /** Kullanıcı şikayet et */
  report: (supabase: TypedSupabaseClient, data: InsertDto<'reports'>) =>
    supabase
      .from('reports')
      .insert(data)
      .select()
      .single(),
}
